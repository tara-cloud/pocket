'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useToken } from '@/lib/useToken';

type Repo = { id: number; name: string; description: string; repoType: string; artifactCount: number; latestVersion: string; createdAt: string };

const TYPE_BADGE: Record<string, string> = {
  firmware: 'badge-firmware', library: 'badge-library', npm: 'badge-npm', generic: 'badge-generic',
};

export default function Home() {
  const [repos, setRepos]     = useState<Repo[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState({ name: '', description: '', repoType: 'generic', isPublic: true });
  const [token, setToken]     = useToken();
  const [err, setErr]         = useState('');

  useEffect(() => { fetch('/api/repos').then(r => r.json()).then(setRepos); }, []);

  async function createRepo(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    const res = await fetch('/api/repos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Pocket-Token': token },
      body: JSON.stringify(form),
    });
    if (!res.ok) { setErr((await res.json()).error); return; }
    const r = await res.json();
    setRepos(prev => [r, ...prev]);
    setShowForm(false);
    setForm({ name: '', description: '', repoType: 'generic', isPublic: true });
  }

  return (
    <>
      <div className="section-header">
        <h1>Repositories</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
          {showForm ? 'Cancel' : '+ New Repository'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h2>Create Repository</h2>
          <form onSubmit={createRepo} className="form-group">
            <div className="form-row">
              <div className="field"><label>Name</label><input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. tara-firmware" /></div>
              <div className="field"><label>Type</label>
                <select value={form.repoType} onChange={e => setForm(f => ({...f, repoType: e.target.value}))}>
                  <option value="generic">Generic</option>
                  <option value="firmware">Firmware</option>
                  <option value="library">Library</option>
                  <option value="npm">NPM</option>
                </select>
              </div>
            </div>
            <div className="field"><label>Description</label><input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Optional" /></div>
            <div className="field"><label>API Token (X-Pocket-Token)</label><input type="password" value={token} onChange={e => setToken(e.target.value)} required placeholder="Master key or API key" /></div>
            {err && <p style={{ color: 'var(--red)', fontSize: '.82rem' }}>{err}</p>}
            <div><button type="submit" className="btn btn-primary">Create</button></div>
          </form>
        </div>
      )}

      {repos.length === 0 ? (
        <div className="empty">No repositories yet. Create one to get started.</div>
      ) : (
        <div className="grid">
          {repos.map(r => (
            <Link key={r.id} href={`/repo/${r.name}`}>
              <div className="card" style={{ cursor: 'pointer', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <strong style={{ fontSize: '.95rem' }}>{r.name}</strong>
                  <span className={`badge ${TYPE_BADGE[r.repoType] || 'badge-generic'}`}>{r.repoType}</span>
                </div>
                {r.description && <p style={{ fontSize: '.82rem', color: 'var(--muted)', marginBottom: 12 }}>{r.description}</p>}
                <div style={{ display: 'flex', gap: 20, fontSize: '.78rem', color: 'var(--muted)' }}>
                  <span>📦 {r.artifactCount} artifacts</span>
                  {r.latestVersion && <span>🏷 {r.latestVersion}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
