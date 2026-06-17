'use client';
import { useEffect, useState } from 'react';

type Artifact   = { id: number; name: string; version: string; fileName: string; repositoryId: number };
type OTARelease = { id: number; artifactId: number; artifact: Artifact; deviceType: string; version: string; releaseNotes: string; pushedAt: string | null; createdAt: string };

function ago(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  return `${Math.floor(s/3600)}h ago`;
}

export default function OTAPage() {
  const [releases, setReleases] = useState<OTARelease[]>([]);
  const [repos, setRepos]       = useState<{id: number; name: string}[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [token, setToken]       = useState('');
  const [pushing, setPushing]   = useState<number | null>(null);
  const [form, setForm] = useState({ artifactId: '', deviceType: 'robot', version: '', releaseNotes: '' });
  const [err, setErr] = useState('');

  async function load() {
    const [r, rp] = await Promise.all([
      fetch('/api/ota').then(r => r.json()),
      fetch('/api/repos').then(r => r.json()),
    ]);
    setReleases(Array.isArray(r) ? r : []);
    setRepos(Array.isArray(rp) ? rp : []);
  }
  useEffect(() => { load(); }, []);

  async function loadArtifacts(repoName: string) {
    const a = await fetch(`/api/repos/${repoName}/artifacts`).then(r => r.json());
    setArtifacts(Array.isArray(a) ? a : []);
  }

  async function createRelease(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    const res = await fetch('/api/ota', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Pocket-Token': token },
      body: JSON.stringify({ ...form, artifactId: parseInt(form.artifactId) }),
    });
    if (!res.ok) { setErr((await res.json()).error); return; }
    load();
    setShowForm(false);
    setForm({ artifactId: '', deviceType: 'robot', version: '', releaseNotes: '' });
  }

  async function push(id: number) {
    setPushing(id);
    const res = await fetch(`/api/ota/${id}/push`, {
      method: 'POST',
      headers: { 'X-Pocket-Token': token },
    });
    setPushing(null);
    if (!res.ok) { alert((await res.json()).error); return; }
    load();
  }

  return (
    <>
      <div className="section-header">
        <h1>OTA Releases</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>{showForm ? 'Cancel' : '+ New Release'}</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h2>Create OTA Release</h2>
          <form onSubmit={createRelease} className="form-group">
            <div className="form-row">
              <div className="field"><label>Repository</label>
                <select onChange={e => loadArtifacts(e.target.value)}>
                  <option value="">Select repo…</option>
                  {repos.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
              </div>
              <div className="field"><label>Artifact</label>
                <select value={form.artifactId} onChange={e => setForm(f => ({...f, artifactId: e.target.value}))}>
                  <option value="">Select artifact…</option>
                  {artifacts.map(a => <option key={a.id} value={a.id}>{a.name} @ {a.version}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="field"><label>Device Type</label><input value={form.deviceType} onChange={e => setForm(f => ({...f, deviceType: e.target.value}))} placeholder="e.g. robot" /></div>
              <div className="field"><label>Version</label><input value={form.version} onChange={e => setForm(f => ({...f, version: e.target.value}))} placeholder="e.g. 1.1.0" /></div>
            </div>
            <div className="field"><label>Release Notes</label><input value={form.releaseNotes} onChange={e => setForm(f => ({...f, releaseNotes: e.target.value}))} placeholder="What changed?" /></div>
            <div className="field"><label>API Token</label><input type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="X-Pocket-Token" /></div>
            {err && <p style={{ color: 'var(--red)', fontSize: '.82rem' }}>{err}</p>}
            <div><button type="submit" className="btn btn-primary">Create Release</button></div>
          </form>
        </div>
      )}

      <div className="card">
        {releases.length === 0 ? (
          <div className="empty">No OTA releases yet.</div>
        ) : (
          <>
            {!token && (
              <div style={{ marginBottom: 14 }}>
                <input type="password" className="field" style={{ maxWidth: 320, padding: '7px 12px', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, fontSize: '.82rem' }}
                  placeholder="API token for push" value={token} onChange={e => setToken(e.target.value)} />
              </div>
            )}
            <table>
              <thead><tr><th>Device Type</th><th>Version</th><th>Artifact</th><th>Notes</th><th>Status</th><th>Created</th><th></th></tr></thead>
              <tbody>
                {releases.map(r => (
                  <tr key={r.id}>
                    <td><code>{r.deviceType}</code></td>
                    <td><strong>{r.version}</strong></td>
                    <td style={{ fontSize: '.78rem', color: 'var(--muted)' }}>{r.artifact?.name} @ {r.artifact?.version}</td>
                    <td style={{ fontSize: '.78rem', color: 'var(--muted)' }}>{r.releaseNotes || '—'}</td>
                    <td>
                      {r.pushedAt
                        ? <span style={{ color: 'var(--green)', fontSize: '.78rem' }}>✓ Pushed {ago(r.pushedAt)}</span>
                        : <span style={{ color: 'var(--muted)', fontSize: '.78rem' }}>Not pushed</span>
                      }
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: '.78rem' }}>{ago(r.createdAt)}</td>
                    <td>
                      <button className="btn btn-green btn-sm" onClick={() => push(r.id)} disabled={pushing === r.id}>
                        {pushing === r.id ? '…' : '⚡ Push OTA'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </>
  );
}
