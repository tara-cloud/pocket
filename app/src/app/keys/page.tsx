'use client';
import { useEffect, useState } from 'react';
import { useToken } from '@/lib/useToken';

type APIKey = { id: number; name: string; createdAt: string };

export default function KeysPage() {
  const [keys, setKeys]         = useState<APIKey[]>([]);
  const [name, setName]         = useState('');
  const [master, setMaster]     = useToken();
  const [newToken, setNewToken] = useState('');
  const [err, setErr]           = useState('');

  async function load() {
    const res = await fetch('/api/keys', { headers: { 'X-Pocket-Token': master } });
    if (res.ok) setKeys(await res.json());
  }
  useEffect(() => { if (master) load(); }, [master]);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setNewToken('');
    const res = await fetch('/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Pocket-Token': master },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) { setErr((await res.json()).error); return; }
    const data = await res.json();
    setNewToken(data.token);
    setName('');
    load();
  }

  async function del(id: number) {
    if (!confirm('Delete this key?')) return;
    await fetch(`/api/keys/${id}`, { method: 'DELETE', headers: { 'X-Pocket-Token': master } });
    load();
  }

  return (
    <>
      <h1>API Keys</h1>

      <div className="card section">
        <h2>Authenticate</h2>
        <div className="field" style={{ maxWidth: 400 }}>
          <label>Master Key (POCKET_MASTER_KEY from server env)</label>
          <input type="password" value={master} onChange={e => { setMaster(e.target.value); }} placeholder="Enter master key to manage API keys" />
        </div>
        {master && <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={load}>Load Keys</button>}
      </div>

      <div className="card section">
        <h2>Create Key</h2>
        <form onSubmit={create} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Key Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. ci-pipeline" required />
          </div>
          <button type="submit" className="btn btn-primary">Generate</button>
        </form>
        {err && <p style={{ color: 'var(--red)', fontSize: '.82rem', marginTop: 8 }}>{err}</p>}
        {newToken && (
          <div>
            <p style={{ color: 'var(--green)', fontSize: '.82rem', marginTop: 10 }}>✓ Key created — copy it now, it won&apos;t be shown again:</p>
            <div className="token-box">{newToken}</div>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Active Keys</h2>
        {keys.length === 0 ? (
          <div className="empty">{master ? 'No API keys.' : 'Enter master key above to view keys.'}</div>
        ) : (
          <table>
            <thead><tr><th>Name</th><th>Created</th><th></th></tr></thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id}>
                  <td>{k.name}</td>
                  <td style={{ color: 'var(--muted)', fontSize: '.78rem' }}>{new Date(k.createdAt).toLocaleString()}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => del(k.id)}>Revoke</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
