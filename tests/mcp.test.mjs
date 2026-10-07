// Run against a disposable local PostgreSQL database containing the repository migrations.
// MCP_TEST_PGPORT=54365 node --test tests/mcp.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import handler from '../api/mcp.mjs';
import { toolDefinitions } from '../server/calendar-mcp.mjs';

const quote = v => `'${String(v).replaceAll("'","''")}'`;
const sql = text => execFileSync('psql',['-qXAt','-h','127.0.0.1','-p',process.env.MCP_TEST_PGPORT ?? '54365','-U','postgres','-v','ON_ERROR_STOP=1'],{input:text,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
const query = text => JSON.parse(sql(text));
const operate = (token,operation,args={}) => query(`SET ROLE anon; SELECT public.mcp_execute(${quote(token)},${quote(operation)},${quote(JSON.stringify(args))}::jsonb);`);
// SET commands output nothing with -q, so use SELECT-only user claims setup in one DO block.
const session = (user,statement) => `DO $$ BEGIN PERFORM set_config('request.jwt.claims','{"sub":"${user}","role":"authenticated"}',false); END $$; SET ROLE authenticated; ${statement}`;

test('real MCP HTTP transport, RLS isolation, permissions, revocation and full calendar operations', async () => {
 const a=randomUUID(),b=randomUUID(); const calendars=[]; let api,rest,client;
 // Test database guard prevents accidental writes to a production database.
 assert.equal(sql("select inet_server_port();"), process.env.MCP_TEST_PGPORT ?? '54365');
 sql(`INSERT INTO auth.users(id,email) VALUES('${a}','mcp-test-a@example.invalid'),('${b}','mcp-test-b@example.invalid');`);
 try {
  const keyA=JSON.parse(sql(session(a,"SELECT public.create_mcp_key('Integration A');")).split('\n').at(-1));
  const keyB=JSON.parse(sql(session(b,"SELECT public.create_mcp_key('Integration B');")).split('\n').at(-1));
  // Small PostgREST adapter over the REAL disposable database, no mocked authorization.
  rest=createServer(async (req,res)=>{
   let body=''; for await (const chunk of req) body+=chunk;
   const args=JSON.parse(body);
   try {const data=operate(args.p_token,args.p_operation,args.p_args);res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));}
   catch(e){const invalid=String(e.stderr).includes('Invalid MCP key');res.statusCode=400;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({code:invalid?'28000':'42501',message:'Rejected'}));}
  });
  await new Promise(r=>rest.listen(0,'127.0.0.1',r));
  process.env.VITE_SUPABASE_URL=`http://127.0.0.1:${rest.address().port}`;
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY='test-public-key';
  api=createServer((req,res)=>void handler(req,res)); await new Promise(r=>api.listen(0,'127.0.0.1',r));
  const url=`http://127.0.0.1:${api.address().port}/api/mcp`;
  assert.equal((await fetch(url,{method:'POST'})).status,401);
  assert.equal((await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${keyA.token}`,Origin:'https://evil.example'}})).status,403);
  client=new Client({name:'integration',version:'1.0'});
  await client.connect(new StreamableHTTPClientTransport(new URL(url),{requestInit:{headers:{Authorization:`Bearer ${keyA.token}`}}}));
  const tools=await client.listTools(); assert.equal(tools.tools.length,toolDefinitions.length);
  const call=async(name,args={})=>{const r=await client.callTool({name,arguments:args});assert.ok(!r.isError,`${name}: ${JSON.stringify(r)}`);return JSON.parse(r.content[0].text);};
  const cal=(await call('create_calendar',{name:'Isolated test',default_note_color:'pink'})).id;calendars.push(cal);
  await call('update_calendar',{calendar_id:cal,changes:{name:'Renamed',default_note_color:'blue'}});
  assert.ok((await call('list_calendars')).some(c=>c.id===cal && c.name==='Renamed'));
  const n=await call('create_note',{calendar_id:cal,text:'First',date:'2026-10-07'});
  assert.equal(n.color,'blue');
  const n2=await call('create_note',{calendar_id:cal,text:'Todo',date:null});
  assert.equal((await call('update_note',{note_id:n.id,changes:{is_struck:true,color:'green'}})).is_struck,true);
  assert.equal((await call('update_note',{note_id:n.id,changes:{is_struck:false}})).is_struck,false);
  assert.equal((await call('list_notes',{calendar_id:cal,undated:true})).length,1);
  assert.deepEqual(operate(keyB.token,'list_notes',{calendar_id:cal}),[]);
  assert.throws(()=>operate(keyB.token,'update_note',{note_id:n.id,changes:{text:'Attack'}}));
  assert.throws(()=>operate(keyB.token,'create_note',{calendar_id:cal,date:null,text:'Attack'}));
  assert.throws(()=>operate(keyB.token,'delete_calendar',{calendar_id:cal,confirm:true}));
  const conn=await call('create_connection',{calendar_id:cal,source_note_id:n.id,target_note_id:n2.id});
  assert.equal((await call('list_connections',{calendar_id:cal})).length,1);
  await call('delete_connection',{connection_id:conn.id,confirm:true});
  await call('update_settings',{changes:{calendarColor:'green',showInbox:false}});
  assert.equal((await call('get_settings')).calendarColor,'green');
  assert.deepEqual(operate(keyB.token,'get_settings'),{});
  const inv=await call('create_invite',{calendar_id:cal,role:'viewer',expires_in_days:14});
  operate(keyB.token,'accept_invite',{token:inv.token});
  assert.equal(operate(keyB.token,'list_notes',{calendar_id:cal}).length,2);
  assert.throws(()=>operate(keyB.token,'update_note',{note_id:n.id,changes:{text:'Viewer attack'}}));
  assert.throws(()=>operate(keyB.token,'delete_note',{note_id:n.id,confirm:true}));
  assert.throws(()=>sql(session(b,`INSERT INTO public.calendar_members(calendar_id,user_id,role) VALUES('${cal}','${b}','owner');`)));
  operate(keyB.token,'leave_calendar',{calendar_id:cal,confirm:true});
  const slug=`mcp-test-${randomUUID().slice(0,8)}`;
  const share=await call('create_share_link',{slug,permission:'viewer',calendar_ids:[cal],password:'isolated-test-password'});
  assert.ok((await call('list_share_links')).some(s=>s.id===share.id));
  await call('update_share_link',{share_link_id:share.id,changes:{permission:'editor'}});
  assert.throws(()=>operate(keyB.token,'update_share_link',{share_link_id:share.id,changes:{permission:'editor'}}));
  await call('revoke_share_link',{share_link_id:share.id,confirm:true});
  assert.ok((await client.callTool({name:'create_note',arguments:{calendar_id:cal,text:'Bad',date:'2026-02-30'}})).isError);
  assert.ok((await client.callTool({name:'update_note',arguments:{note_id:n.id,changes:{user_id:b}}})).isError);
  await call('delete_note',{note_id:n.id,confirm:true});
  await call('delete_note',{note_id:n2.id,confirm:true});
  await call('delete_calendar',{calendar_id:cal,confirm:true});
  sql(session(a,`SELECT public.revoke_mcp_key('${keyA.id}');`));
  assert.equal((await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${keyA.token}`}})).status,401);
  assert.throws(()=>operate(keyA.token,'list_calendars'));
  assert.equal(sql("select coalesce(current_setting('request.jwt.claims',true),'');"),'');
 } finally {
  if(client)await client.close(); if(api)await new Promise(r=>api.close(r)); if(rest)await new Promise(r=>rest.close(r));
  sql(`DELETE FROM public.public_share_links WHERE created_by IN ('${a}','${b}'); DELETE FROM public.calendars WHERE owner_id IN ('${a}','${b}'); DELETE FROM auth.users WHERE id IN ('${a}','${b}');`);
  assert.equal(sql(`SELECT count(*) FROM calendar_mcp_private.tokens WHERE user_id IN ('${a}','${b}');`),'0');
 }
});
