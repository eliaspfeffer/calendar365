import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Key = { id: string; name: string; expires_at: string };
const rpc = supabase.rpc.bind(supabase) as (name: string, args?: Record<string, unknown>) => PromiseLike<{data: unknown; error: {message:string} | null}>;
export default function AgentAccess() {
  const { user, isLoading } = useAuth();
  const [keys,setKeys] = useState<Key[]>([]);
  const [name,setName] = useState('Agent');
  const [token,setToken] = useState('');
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const refresh = useCallback(async () => {
    if (!user) return;
    const result=await rpc('list_mcp_keys');
    if (result.error) setError('Agent access is unavailable. Please try again later.');
    else setKeys((result.data ?? []) as Key[]);
  },[user]);
  useEffect(()=>{setToken(''); setKeys([]);},[user?.id]);
  useEffect(()=>{void refresh();},[refresh]);
  const create = async () => {
    setBusy(true); setError(''); setToken('');
    try {
      const result=await rpc('create_mcp_key',{p_name:name.trim()});
      if (result.error) setError('Could not create a key. Check the name or revoke an existing key first.');
      else {setToken((result.data as {token:string}).token); await refresh();}
    } finally {setBusy(false);}
  };
  const revoke = async (id:string) => {
    setBusy(true); setError('');
    try {
      const result=await rpc('revoke_mcp_key',{p_id:id});
      if (result.error) setError('Could not revoke the key. Please try again.');
      else {setToken(''); await refresh();}
    } finally {setBusy(false);}
  };
  return <main className="mx-auto max-w-2xl space-y-6 p-6 pb-24">
    <Link to="/" className="text-sm underline">Back to calendar</Link>
    <h1 className="text-2xl font-semibold">Agent access</h1>
    <p>Connect an MCP client to <code>https://www.calendar365.app/api/mcp</code> using Streamable HTTP and a Bearer key.</p>
    <p className="text-sm text-muted-foreground">A key lets its holder read and edit calendars available to your account, including deleting notes and managing share links. Keys expire after 90 days. Give a key only to an agent you trust.</p>
    {isLoading ? <p>Loading…</p> : !user ? <Link to="/auth" className="underline">Sign in to manage agent access</Link> : <>
      <div className="space-y-2">
        <Label htmlFor="agent-key-name">Key name</Label>
        <Input id="agent-key-name" value={name} onChange={e=>setName(e.target.value)} maxLength={100} />
        <Button onClick={()=>void create()} disabled={busy || !name.trim()}>Create key — allow agent access</Button>
      </div>
      {token && <div className="space-y-2">
        <Label htmlFor="agent-key">New key (shown once)</Label>
        <Input id="agent-key" type="password" readOnly value={token} autoComplete="off" />
        <Button variant="outline" onClick={()=>void navigator.clipboard.writeText(token).catch(()=>setError('Copy failed. Select and copy the key field.'))}>Copy key</Button>
        <p className="text-sm">Store this in your MCP client's secret storage. It will disappear when you leave this page.</p>
      </div>}
      <ul className="space-y-3">{keys.map(key=><li key={key.id} className="flex items-center justify-between gap-4 rounded border p-3">
        <span>{key.name}<span className="block text-xs text-muted-foreground">Expires {new Date(key.expires_at).toLocaleDateString()}</span></span>
        <Button variant="outline" disabled={busy} onClick={()=>void revoke(key.id)} aria-label={`Revoke ${key.name}`}>Revoke</Button>
      </li>)}</ul>
    </>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
  </main>;
}
