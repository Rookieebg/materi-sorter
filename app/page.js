'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const SEMESTERS = Array.from({ length: 14 }, (_, i) => String(i + 1));
const fmtSize = (n) =>
  !n ? '' : n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
const fmtDate = (s) => new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const byNum = (a, b) => Number(a) - Number(b) || a.localeCompare(b);

export default function Home() {
  const [me, setMe] = useState(undefined); // undefined = memuat, null = belum login
  const [loginError, setLoginError] = useState(false);

  useEffect(() => {
    setLoginError(new URLSearchParams(location.search).get('error') === 'login');
    fetch('/api/me').then((r) => (r.ok ? r.json() : null)).then(setMe).catch(() => setMe(null));
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setMe(null);
  }

  if (me === undefined) return <main className="wrap"><p>Memuat…</p></main>;

  if (!me)
    return (
      <main className="wrap">
        <div className="top"><div className="brand"><span>Rapi</span> Materi</div></div>
        <section className="hero">
          <h1>Materi dosen dari WhatsApp, langsung tersusun di Drive.</h1>
          <p>Unggah file, pilih semester, mata kuliah, dan bab. Folder yang sesuai dibuat otomatis di Google Drive kamu.</p>
          <div className="demo-path" aria-hidden="true">
            <span className="seg">Semester 1</span><span className="seg">Kalkulus</span><span className="seg">Bab 1</span>
          </div>
          {loginError && <p className="err">Login gagal. Coba lagi.</p>}
          <div><a className="btn primary" href="/api/auth/login">Masuk dengan Google</a></div>
        </section>
      </main>
    );

  return <Dashboard me={me} onLogout={logout} />;
}

function Dashboard({ me, onLogout }) {
  const [view, setView] = useState('aktif'); // 'aktif' | 'terhapus'
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fSem, setFSem] = useState('');
  const [fMk, setFMk] = useState('');
  const [fBab, setFBab] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await fetch(`/api/files?trashed=${view === 'terhapus' ? 1 : 0}`);
      const j = await r.json();
      if (r.status === 401) return onLogout();
      if (!r.ok) throw new Error(j.error);
      setFiles(j.files);
    } catch (e) {
      setError(e.message || 'Gagal memuat file.');
    } finally {
      setLoading(false);
    }
  }, [view, onLogout]);

  useEffect(() => { load(); }, [load]);

  // opsi filter berjenjang: semester → mata kuliah → bab
  const semOpts = useMemo(() => [...new Set(files.map((f) => f.semester))].filter(Boolean).sort(byNum), [files]);
  const mkOpts = useMemo(
    () => [...new Set(files.filter((f) => !fSem || f.semester === fSem).map((f) => f.matkul))].filter(Boolean).sort((a, b) => a.localeCompare(b)),
    [files, fSem]
  );
  const babOpts = useMemo(
    () => [...new Set(files.filter((f) => (!fSem || f.semester === fSem) && (!fMk || f.matkul === fMk)).map((f) => f.bab))].filter(Boolean).sort(byNum),
    [files, fSem, fMk]
  );
  const shown = files.filter(
    (f) => (!fSem || f.semester === fSem) && (!fMk || f.matkul === fMk) && (!fBab || f.bab === fBab)
  );

  async function act(id, action) {
    const r = await fetch(`/api/files/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (!r.ok) setError((await r.json()).error);
    else load();
  }

  return (
    <main className="wrap">
      <div className="top">
        <div className="brand"><span>Rapi</span> Materi</div>
        <div className="acct">
          <span>Drive: <b>{me.email}</b></span>
          <a className="btn small" href="/api/auth/login">Ganti akun</a>
          <button className="btn small" onClick={onLogout}>Keluar</button>
        </div>
      </div>

      <UploadForm existing={files} onDone={() => { setView('aktif'); load(); }} />

      <section className="panel">
        <h2>Materi kamu</h2>
        <div className="views" role="group" aria-label="Tampilan">
          <button aria-pressed={view === 'aktif'} onClick={() => setView('aktif')}>Di Drive</button>
          <button aria-pressed={view === 'terhapus'} onClick={() => setView('terhapus')}>Terhapus dari Drive</button>
        </div>

        {view === 'terhapus' && (
          <p className="note">
            File yang kamu hapus dari Drive masuk Tempat Sampah dan tetap muncul di sini selama 30 hari. Setelah itu Google menghapusnya permanen dan file tidak bisa dipulihkan.
          </p>
        )}

        <div className="filters">
          <label className="f">Semester
            <select value={fSem} onChange={(e) => { setFSem(e.target.value); setFMk(''); setFBab(''); }}>
              <option value="">Semua</option>
              {semOpts.map((s) => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </label>
          <label className="f">Mata kuliah
            <select value={fMk} onChange={(e) => { setFMk(e.target.value); setFBab(''); }}>
              <option value="">Semua</option>
              {mkOpts.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <label className="f">Bab
            <select value={fBab} onChange={(e) => setFBab(e.target.value)}>
              <option value="">Semua</option>
              {babOpts.map((b) => <option key={b} value={b}>Bab {b}</option>)}
            </select>
          </label>
        </div>

        {error && <p className="msg bad">{error}</p>}
        {loading ? (
          <p className="empty">Memuat…</p>
        ) : shown.length === 0 ? (
          <p className="empty">
            {view === 'aktif' ? 'Belum ada materi. Unggah file pertamamu di atas.' : 'Tidak ada file di Tempat Sampah Drive.'}
          </p>
        ) : (
          <ul className="list">
            {shown.map((f) => (
              <li className="row" key={f.id}>
                <div className="info">
                  <div className="name">{f.name}</div>
                  <div className="meta">
                    Semester {f.semester} / {f.matkul} / Bab {f.bab} · {fmtDate(f.createdTime)}{f.size ? ` · ${fmtSize(f.size)}` : ''}
                  </div>
                </div>
                <div className="acts">
                  {view === 'aktif' ? (
                    <>
                      {f.link && <a className="btn small" href={f.link} target="_blank" rel="noreferrer">Buka</a>}
                      <a className="btn small" href={`/api/files/${f.id}/download`}>Unduh</a>
                    </>
                  ) : (
                    <>
                      <a className="btn small" href={`/api/files/${f.id}/download`}>Unduh</a>
                      <button className="btn small primary" onClick={() => act(f.id, 'restore')}>Pulihkan ke Drive</button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function UploadForm({ existing, onDone }) {
  const [semester, setSemester] = useState('1');
  const [matkul, setMatkul] = useState('');
  const [bab, setBab] = useState('1');
  const [picked, setPicked] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const knownMk = useMemo(
    () => [...new Set(existing.filter((f) => f.semester === semester).map((f) => f.matkul))],
    [existing, semester]
  );

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set('semester', semester);
      fd.set('matkul', matkul);
      fd.set('bab', bab);
      picked.forEach((f) => fd.append('files', f));
      const r = await fetch('/api/files', { method: 'POST', body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setMsg({ ok: true, text: `${j.count} file masuk ke Drive.` });
      setPicked([]);
      e.target.reset();
      onDone();
    } catch (err) {
      setMsg({ ok: false, text: err.message || 'Upload gagal.' });
    } finally {
      setBusy(false);
    }
  }

  const path = `Materi Kuliah / Semester ${semester} / ${matkul.trim() || '…'} / Bab ${bab || '…'}`;

  return (
    <form className="panel" onSubmit={submit}>
      <h2>Unggah materi</h2>
      <div className="grid3">
        <label className="f">Semester
          <select value={semester} onChange={(e) => setSemester(e.target.value)}>
            {SEMESTERS.map((s) => <option key={s} value={s}>Semester {s}</option>)}
          </select>
        </label>
        <label className="f">Mata kuliah
          <input value={matkul} onChange={(e) => setMatkul(e.target.value)} list="mk-list" placeholder="Contoh: Kalkulus" required />
          <datalist id="mk-list">{knownMk.map((m) => <option key={m} value={m} />)}</datalist>
        </label>
        <label className="f">Bab
          <input type="number" min="1" max="99" value={bab} onChange={(e) => setBab(e.target.value)} required />
        </label>
      </div>

      <div className="drop">
        <input type="file" multiple required onChange={(e) => setPicked([...e.target.files])} />
        <small>{picked.length ? `${picked.length} file dipilih` : 'PDF, PPT, Word, gambar, atau file apa pun dari WhatsApp'}</small>
      </div>

      <p className="target">Disimpan di: <code>{path}</code></p>
      <button className="btn primary" disabled={busy}>{busy ? 'Mengunggah…' : 'Unggah ke Drive'}</button>
      {msg && <p className={`msg ${msg.ok ? 'ok' : 'bad'}`}>{msg.text}</p>}
    </form>
  );
}
