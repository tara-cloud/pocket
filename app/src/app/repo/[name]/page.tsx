'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToken } from '@/lib/useToken';

type Artifact = { id: number; name: string; version: string; fileName: string; size: number; checksum: string; downloadCount: number; contentType: string; createdAt: string };
type Repo     = { id: number; name: string; description: string; repoType: string };

function fmt(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes/1024).toFixed(1)} KB`;
  return `${(bytes/1048576).toFixed(1)} MB`;
}
function ago(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  return `${Math.floor(s/3600)}h ago`;
}

export default function RepoPage() {
  const { name } = useParams<{ name: string }>();
  const router   = useRouter();
  const [repo, setRepo]           = useState<Repo | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [token, setToken]         = useToken();
  const [uploading, setUploading] = useState(false);
  const [uploadVer, setUploadVer] = useState('');
  const [uploadName, setUploadName] = useState('');
  const [err, setErr]             = useState('');
  const [deleting, setDeleting]   = useState(false);
  const [selected, setSelected]   = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const [r, a] = await Promise.all([
      fetch(`/api/repos/${name}`).then(r => r.json()),
      fetch(`/api/repos/${name}/artifacts`).then(r => r.json()),
    ]);
    setRepo(r);
    setArtifacts(Array.isArray(a) ? a : []);
    setSelected(new Set());
  }
  useEffect(() => { load(); }, [name]);

  function toggleOne(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected(prev =>
      prev.size === artifacts.length ? new Set() : new Set(artifacts.map(a => a.id))
    );
  }

  async function upload(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setUploading(true);
    const file = fileRef.current?.files?.[0];
    if (!file) { setErr('Select a file'); setUploading(false); return; }
    const fd = new FormData();
    fd.append('file', file);
    if (uploadVer)  fd.append('version', uploadVer);
    if (uploadName) fd.append('name',    uploadName);
    const res = await fetch(`/api/repos/${name}/artifacts`, {
      method: 'POST',
      headers: { 'X-Pocket-Token': token },
      body: fd,
    });
    setUploading(false);
    if (!res.ok) { setErr((await res.json()).error); return; }
    load();
    setUploadVer(''); setUploadName('');
    if (fileRef.current) fileRef.current.value = '';
  }

  async function deleteArtifact(id: number) {
    if (!token) { setErr('Enter an API key before deleting.'); return; }
    if (!confirm('Delete this artifact?')) return;
    const res = await fetch(`/api/repos/${name}/artifacts/${id}`, {
      method: 'DELETE', headers: { 'X-Pocket-Token': token },
    });
    if (!res.ok) { setErr((await res.json()).error); return; }
    load();
  }

  async function deleteSelected() {
    if (!token) { setErr('Enter an API key before deleting.'); return; }
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} selected artifact${selected.size > 1 ? 's' : ''}? This cannot be undone.`)) return;
    setBulkDeleting(true);
    setErr('');
    const failures: number[] = [];
    for (const id of selected) {
      try {
        const res = await fetch(`/api/repos/${name}/artifacts/${id}`, {
          method: 'DELETE', headers: { 'X-Pocket-Token': token },
        });
        if (!res.ok) failures.push(id);
      } catch {
        failures.push(id);
      }
    }
    setBulkDeleting(false);
    if (failures.length) setErr(`${failures.length} of ${selected.size} deletes failed.`);
    load();
  }

  async function deleteRepo() {
    if (!token) { setErr('Enter an API key before deleting.'); return; }
    if (!confirm(`Delete repository "${name}" and ALL its artifacts? This cannot be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/repos/${name}`, {
      method: 'DELETE', headers: { 'X-Pocket-Token': token },
    });
    setDeleting(false);
    if (!res.ok) { setErr((await res.json()).error); return; }
    router.push('/');
  }

  if (!repo) return <p style={{ color: 'var(--muted)' }}>Loading…</p>;

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <Link href="/" style={{ color: 'var(--muted)', fontSize: '.83rem' }}>← Repositories</Link>
      </div>

      <div className="section-header">
        <div>
          <h1 style={{ marginBottom: 4 }}>{repo.name}</h1>
          {repo.description && <p style={{ color: 'var(--muted)', fontSize: '.85rem' }}>{repo.description}</p>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '.82rem', color: 'var(--muted)' }}>{artifacts.length} artifacts</span>
          <input
            type="password"
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="API key"
            style={{ fontSize: '.82rem', padding: '4px 8px', width: 160 }}
          />
          <button className="btn btn-danger btn-sm" onClick={deleteRepo} disabled={deleting}>
            {deleting ? 'Deleting…' : '🗑 Delete Repo'}
          </button>
        </div>
      </div>

      {/* Upload form */}
      <div className="card section">
        <h2>Upload Artifact</h2>
        <form onSubmit={upload} className="form-group">
          <div className="form-row">
            <div className="field"><label>Name (optional — defaults to filename)</label><input value={uploadName} onChange={e => setUploadName(e.target.value)} placeholder="e.g. tara-robot-fw" /></div>
            <div className="field"><label>Version</label><input value={uploadVer} onChange={e => setUploadVer(e.target.value)} placeholder="e.g. 1.0.0" /></div>
          </div>
          <div className="field"><label>File</label><input type="file" ref={fileRef} required style={{ padding: '6px 0' }} /></div>
          {err && <p style={{ color: 'var(--red)', fontSize: '.82rem' }}>{err}</p>}
          <div><button type="submit" className="btn btn-primary" disabled={uploading}>{uploading ? 'Uploading…' : '↑ Upload'}</button></div>
        </form>
      </div>

      {/* Artifact table */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>Artifacts</h2>
          {selected.size > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '.82rem', color: 'var(--muted)' }}>{selected.size} selected</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())} disabled={bulkDeleting}>Clear</button>
              <button className="btn btn-danger btn-sm" onClick={deleteSelected} disabled={bulkDeleting}>
                {bulkDeleting ? 'Deleting…' : `🗑 Delete ${selected.size}`}
              </button>
            </div>
          )}
        </div>
        {artifacts.length === 0 ? (
          <div className="empty">No artifacts yet.</div>
        ) : (
          <table>
            <thead><tr>
              <th style={{ width: 32 }}>
                <input
                  type="checkbox"
                  checked={selected.size === artifacts.length && artifacts.length > 0}
                  ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < artifacts.length; }}
                  onChange={toggleAll}
                  aria-label="Select all"
                />
              </th>
              <th>Name</th><th>Version</th><th>File</th><th>Size</th><th>Downloads</th><th>Checksum</th><th>Uploaded</th><th></th>
            </tr></thead>
            <tbody>
              {artifacts.map(a => (
                <tr key={a.id} style={selected.has(a.id) ? { background: 'var(--surface2, rgba(255,255,255,.04))' } : undefined}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(a.id)}
                      onChange={() => toggleOne(a.id)}
                      aria-label={`Select ${a.name} ${a.version}`}
                    />
                  </td>
                  <td><strong>{a.name}</strong></td>
                  <td><code>{a.version}</code></td>
                  <td>
                    <a href={`/files/${name}/${a.name}/${a.version}/${a.fileName}`} style={{ color: 'var(--accent)' }}>
                      {a.fileName}
                    </a>
                  </td>
                  <td style={{ color: 'var(--muted)' }}>{fmt(a.size)}</td>
                  <td style={{ color: 'var(--muted)' }}>{a.downloadCount}</td>
                  <td><code style={{ fontSize: '.7rem', color: 'var(--muted)' }}>{a.checksum.slice(0, 12)}…</code></td>
                  <td style={{ color: 'var(--muted)', fontSize: '.78rem' }}>{ago(a.createdAt)}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => deleteArtifact(a.id)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
