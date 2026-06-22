'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useToken } from '@/lib/useToken';

type Repo = { id: number; name: string; description: string; repoType: string; tags: string[]; keepLatest: number; artifactCount: number; latestVersion: string; createdAt: string };

const TYPE_BADGE: Record<string, string> = {
  firmware: 'badge-firmware', library: 'badge-library', npm: 'badge-npm', generic: 'badge-generic',
};

export default function Home() {
  const [repos, setRepos]       = useState<Repo[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ name: '', description: '', repoType: 'generic', isPublic: true, tagsInput: '', keepLatest: 0 });
  const [token, setToken]       = useToken();
  const [err, setErr]           = useState('');
  const [filterTags, setFilterTags] = useState<string[]>([]);

  useEffect(() => { fetch('/api/repos').then(r => r.json()).then(setRepos); }, []);

  const allTags = Array.from(new Set(repos.flatMap(r => r.tags ?? []))).sort();
  const visible = filterTags.length > 0
    ? repos.filter(r => filterTags.every(t => (r.tags ?? []).includes(t)))
    : repos;

  function toggleTag(tag: string) {
    setFilterTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }

  async function createRepo(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    const tags = form.tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    const res = await fetch('/api/repos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Pocket-Token': token },
      body: JSON.stringify({ name: form.name, description: form.description, repoType: form.repoType, isPublic: form.isPublic, tags, keepLatest: form.keepLatest }),
    });
    if (!res.ok) { setErr((await res.json()).error); return; }
    const r = await res.json();
    setRepos(prev => [r, ...prev]);
    setShowForm(false);
    setForm({ name: '', description: '', repoType: 'generic', isPublic: true, tagsInput: '', keepLatest: 0 });
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
            <div className="form-row">
              <div className="field"><label>Tags <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(comma-separated)</span></label><input value={form.tagsInput} onChange={e => setForm(f => ({...f, tagsInput: e.target.value}))} placeholder="e.g. robot, esp32, stable" /></div>
              <div className="field"><label>Keep latest <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(0 = unlimited)</span></label><input type="number" min={0} value={form.keepLatest} onChange={e => setForm(f => ({...f, keepLatest: parseInt(e.target.value) || 0}))} /></div>
            </div>
            <div className="field"><label htmlFor="repo-token">API Key</label><input id="repo-token" type="password" value={token} onChange={e => setToken(e.target.value)} required placeholder="Paste an API key from the Keys page" /></div>
            {err && <p style={{ color: 'var(--red)', fontSize: '.82rem' }}>{err}</p>}
            <div><button type="submit" className="btn btn-primary">Create</button></div>
          </form>
        </div>
      )}

      {allTags.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
          <span style={{ fontSize: '.78rem', color: 'var(--muted)' }}>#</span>
          <button
            className={`badge ${filterTags.length === 0 ? 'badge-firmware' : 'badge-generic'}`}
            style={{ cursor: 'pointer', border: 'none', background: 'none' }}
            onClick={() => setFilterTags([])}
          >
            All
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              className={`badge ${filterTags.includes(tag) ? 'badge-firmware' : 'badge-generic'}`}
              style={{ cursor: 'pointer', border: 'none', background: 'none' }}
              onClick={() => toggleTag(tag)}
            >
              #{tag}
            </button>
          ))}
          {filterTags.length > 0 && (
            <span style={{ fontSize: '.75rem', color: 'var(--muted)', marginLeft: 4 }}>
              {visible.length} match{visible.length !== 1 ? 'es' : ''}
            </span>
          )}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="empty">{repos.length === 0 ? 'No repositories yet. Create one to get started.' : 'No repositories match the selected tags.'}</div>
      ) : (
        <div className="grid">
          {visible.map(r => (
            <Link key={r.id} href={`/repo/${r.name}`}>
              <div className="card" style={{ cursor: 'pointer', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <strong style={{ fontSize: '.95rem' }}>{r.name}</strong>
                  <span className={`badge ${TYPE_BADGE[r.repoType] || 'badge-generic'}`}>{r.repoType}</span>
                </div>
                {r.description && <p style={{ fontSize: '.82rem', color: 'var(--muted)', marginBottom: 8 }}>{r.description}</p>}
                {r.tags?.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                    {r.tags.map(t => (
                      <span
                        key={t}
                        className={`badge ${filterTags.includes(t) ? 'badge-firmware' : 'badge-generic'}`}
                        style={{ fontSize: '.72rem' }}
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 20, fontSize: '.78rem', color: 'var(--muted)' }}>
                  <span>📦 {r.artifactCount} artifacts</span>
                  {r.latestVersion && <span>🏷 {r.latestVersion}</span>}
                  {r.keepLatest > 0 && <span>🔄 keep {r.keepLatest}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
