'use client';
import { useEffect, useState } from 'react';

type APIKey = { id: number; name: string; description: string; createdAt: string; expiresAt: string | null };

const VALIDITY_OPTIONS = [
  { label: 'No expiry', value: 0 },
  { label: '7 days',    value: 7 },
  { label: '30 days',   value: 30 },
  { label: '90 days',   value: 90 },
  { label: '1 year',    value: 365 },
];

function expiryLabel(expiresAt: string | null): string {
  if (!expiresAt) return '—';
  return new Date(expiresAt).toLocaleDateString();
}

function isExpired(expiresAt: string | null): boolean {
  return !!expiresAt && new Date(expiresAt) < new Date();
}

export default function KeysPage() {
  const [keys, setKeys]           = useState<APIKey[]>([]);
  const [name, setName]           = useState('');
  const [description, setDescription] = useState('');
  const [validDays, setValidDays] = useState(0);
  const [newToken, setNewToken]   = useState('');
  const [err, setErr]             = useState('');

  async function load() {
    const res = await fetch('/api/keys');
    if (res.ok) setKeys(await res.json());
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.SyntheticEvent) {
    e.preventDefault(); setErr(''); setNewToken('');
    const res = await fetch('/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, validDays: validDays || null }),
    });
    if (!res.ok) { setErr((await res.json()).error); return; }
    const data = await res.json();
    setNewToken(data.token);
    setName(''); setDescription(''); setValidDays(0);
    load();
  }

  async function del(id: number) {
    if (!confirm('Revoke this key?')) return;
    await fetch(`/api/keys/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <>
      <h1>API Keys</h1>

      <div className="card section">
        <h2>Create Key</h2>
        <form onSubmit={create} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: 1, minWidth: 160 }}>
            <label htmlFor="key-name">Name</label>
            <input id="key-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. tara-robot-01" required />
          </div>
          <div className="field" style={{ flex: 2, minWidth: 200 }}>
            <label htmlFor="key-desc">Description</label>
            <input id="key-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this key for?" />
          </div>
          <div className="field" style={{ minWidth: 130 }}>
            <label htmlFor="key-validity">Validity</label>
            <select id="key-validity" value={validDays} onChange={e => setValidDays(Number(e.target.value))}>
              {VALIDITY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary">Generate</button>
        </form>
        {err && <p style={{ color: 'var(--red)', fontSize: '.82rem', marginTop: 8 }}>{err}</p>}
        {newToken && (
          <div style={{ marginTop: 12 }}>
            <p style={{ color: 'var(--green)', fontSize: '.82rem' }}>✓ Key created — copy it now, it won&apos;t be shown again:</p>
            <div className="token-box">{newToken}</div>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Keys</h2>
        {keys.length === 0 ? (
          <div className="empty">No API keys yet.</div>
        ) : (
          <table>
            <thead>
              <tr><th>Name</th><th>Description</th><th>Created</th><th>Expires</th><th></th></tr>
            </thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id} style={isExpired(k.expiresAt) ? { opacity: 0.5 } : {}}>
                  <td>
                    {k.name}
                    {isExpired(k.expiresAt) && <span style={{ color: 'var(--red)', fontSize: '.72rem', marginLeft: 6 }}>expired</span>}
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: '.82rem' }}>{k.description || '—'}</td>
                  <td style={{ color: 'var(--muted)', fontSize: '.78rem' }}>{new Date(k.createdAt).toLocaleDateString()}</td>
                  <td style={{ color: isExpired(k.expiresAt) ? 'var(--red)' : 'var(--muted)', fontSize: '.78rem' }}>{expiryLabel(k.expiresAt)}</td>
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
