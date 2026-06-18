'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

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
  const [token, setToken]         = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadVer, setUploadVer] = useState('');
  const [uploadName, setUploadName] = useState('');
  const [err, setErr]             = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const [r, a] = await Promise.all([
      fetch(`/api/repos/${name}`).then(r => r.json()),
      fetch(`/api/repos/${name}/artifacts`).then(r => r.json()),
    ]);
    setRepo(r);
    setArtifacts(Array.isArray(a) ? a : []);
  }
  useEffect(() => { load(); }, [name]);

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
    if (!confirm('Delete this artifact?')) return;
    await fetch(`/api/repos/${name}/artifacts/${id}`, {
      method: 'DELETE', headers: { 'X-Pocket-Token': token },
    });
    load();
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
        <span style={{ fontSize: '.82rem', color: 'var(--muted)' }}>{artifacts.length} artifacts</span>
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
          <div className="field"><label>API Token</label><input type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="X-Pocket-Token" /></div>
          {err && <p style={{ color: 'var(--red)', fontSize: '.82rem' }}>{err}</p>}
          <div><button type="submit" className="btn btn-primary" disabled={uploading}>{uploading ? 'Uploading…' : '↑ Upload'}</button></div>
        </form>
      </div>

      {/* Artifact table */}
      <div className="card">
        <h2>Artifacts</h2>
        {artifacts.length === 0 ? (
          <div className="empty">No artifacts yet.</div>
        ) : (
          <table>
            <thead><tr><th>Name</th><th>Version</th><th>File</th><th>Size</th><th>Downloads</th><th>Checksum</th><th>Uploaded</th><th></th></tr></thead>
            <tbody>
              {artifacts.map(a => (
                <tr key={a.id}>
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
