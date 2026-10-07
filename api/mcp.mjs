import { createClient } from '@supabase/supabase-js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createCalendarMcp } from '../server/calendar-mcp.mjs';

export default async function handler(req, res) {
  res.setHeader('Cache-Control','no-store');
  if (req.headers.origin && !['https://www.calendar365.app','https://calendar365.app'].includes(req.headers.origin)) {
    res.statusCode=403; return res.end('Origin not allowed');
  }
  if (req.method !== 'POST') { res.setHeader('Allow','POST'); res.statusCode=405; return res.end(); }
  const token = /^Bearer (c365_[a-f0-9]{64})$/.exec(req.headers.authorization ?? '')?.[1];
  if (!token) { res.setHeader('WWW-Authenticate','Bearer realm="Calendar365 MCP"'); res.statusCode=401; return res.end('A Calendar365 MCP key is required'); }
  const url=process.env.VITE_SUPABASE_URL, key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {res.statusCode=503; return res.end('MCP configuration unavailable');}
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {error}=await db.rpc('mcp_execute',{p_token:token,p_operation:'authenticate',p_args:{}});
  if (error) {res.statusCode=error.code==='28000'?401:503; return res.end(error.code==='28000'?'Invalid or expired MCP key':'MCP unavailable');}
  const server=createCalendarMcp(db,token);
  const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
  res.on('close',()=>{void transport.close(); void server.close();});
  try {await server.connect(transport); await transport.handleRequest(req,res,req.body);}
  catch {console.error('Calendar365 MCP transport failed'); if (!res.headersSent){res.statusCode=500;res.end('MCP request failed');}}
}
