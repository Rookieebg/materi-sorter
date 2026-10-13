'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const SEMESTERS = Array.from({ length: 14 }, (_, i) => String(i + 1));
const COLORS = ['#3FBF3F', '#FF5C8A', '#7B6CF6', '#A8D82C', '#FF9A3C', '#FFE08A', '#36C2D6'];
const NEW_DAYS = 3;

const fmtSize = (n) =>
  !n ? '' : n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
const fmtDate = (s) => new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const byNum = (a, b) => Number(a) - Number(b) || a.localeCompare(b);
const byName = (a, b) => a.localeCompare(b);
const cleanName = (s) => String(s || '').replace(/[\/\\]/g, '-').trim();
const colorFor = (key) => {
  let h = 0;
  for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
};

function Icon({ name, size = 24 }) {
  const p = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: '#000',
    strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
  };
  switch (name) {
    case 'folder': return <svg {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>;
    case 'book': return <svg {...p}><path d="M12 6c-2-1.5-5-2-8-2v14c3 0 6 .5 8 2 2-1.5 5-2 8-2V4c-3 0-6 .5-8 2zM12 6v14" /></svg>;
    case 'bookmark': return <svg {...p}><path d="M6 3h12v18l-6-4-6 4z" /></svg>;
    case 'gear': return <svg {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" /></svg>;
    case 'search': return <svg {...p}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>;
    case 'plus': return <svg {...p} strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>;
    case 'back': return <svg {...p} strokeWidth="3"><path d="M15 5l-7 7 7 7" /></svg>;
    case 'upload': return <svg {...p}><path d="M12 16V4M7 9l5-5 5 5M4 20h16" /></svg>;
    case 'x': return <svg {...p} strokeWidth="3"><path d="M6 6l12 12M18 6 6 18" /></svg>;
    default: return null;
  }
}

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

  if (me === undefined) return <main className="sheet"><p className="empty">Memuat…</p></main>;

  if (!me)
    return (
      <main className="sheet">
        <section className="hero">
          <p className="brand">Rapi Materi</p>
          <h1>Materi dosen dari WhatsApp, rapi di Drive.</h1>
          <p className="lead">Unggah file, pilih semester, mata kuliah, dan bab. Foldernya dibuat otomatis di Google Drive kamu.</p>
          <div className="chips" aria-hidden="true">
            <span className="chip" style={{ '--c': '#3FBF3F' }}>Semester 1</span>
            <span className="chip" style={{ '--c': '#FF5C8A' }}>Kalkulus</span>
            <span className="chip" style={{ '--c': '#7B6CF6' }}>Bab 1</span>
          </div>
          {loginError && <p className="msg bad">Login gagal. Coba lagi.</p>}
          <a className="btn primary big" href="/api/auth/login">Masuk dengan Google</a>
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
  const [path, setPath] = useState({ sem: '', mk: '', bab: '' });
  const [q, setQ] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showAcct, setShowAcct] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

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

  function changeView(v) {
    setView(v);
    setPath({ sem: '', mk: '', bab: '' });
    setQ('');
  }

  async function act(id, action) {
    const r = await fetch(`/api/files/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (!r.ok) setError((await r.json()).error);
    else load();
  }

  // level: 0 = daftar semester, 1 = daftar mata kuliah, 2 = daftar bab, 3 = isi bab (file)
  const level = !path.sem ? 0 : !path.mk ? 1 : !path.bab ? 2 : 3;

  const inScope = useMemo(
    () => files.filter((f) => (!path.sem || f.semester === path.sem) && (!path.mk || f.matkul === path.mk) && (!path.bab || f.bab === path.bab)),
    [files, path]
  );

  const folders = useMemo(() => {
    if (level === 3) return [];
    const key = level === 0 ? 'semester' : level === 1 ? 'matkul' : 'bab';
    const subKey = level === 0 ? 'matkul' : level === 1 ? 'bab' : null;
    const map = new Map();
    const now = Date.now();
    for (const f of inScope) {
      const k = f[key];
      if (!k) continue;
      if (!map.has(k)) map.set(k, { key: k, count: 0, subs: new Set(), isNew: false });
      const g = map.get(k);
      g.count += 1;
      if (subKey && f[subKey]) g.subs.add(f[subKey]);
      if (now - new Date(f.createdTime).getTime() < NEW_DAYS * 864e5) g.isNew = true;
    }
    return [...map.values()].sort((a, b) => (level === 1 ? byName(a.key, b.key) : byNum(a.key, b.key)));
  }, [inScope, level]);

  const query = q.trim().toLowerCase();
  const results = query
    ? files.filter((f) => `${f.name} ${f.matkul}`.toLowerCase().includes(query))
    : null;

  const crumbs = [
    { label: 'Semua', to: { sem: '', mk: '', bab: '' } },
    path.sem && { label: `Semester ${path.sem}`, to: { sem: path.sem, mk: '', bab: '' } },
    path.mk && { label: path.mk, to: { sem: path.sem, mk: path.mk, bab: '' } },
    path.bab && { label: `Bab ${path.bab}`, to: path },
  ].filter(Boolean);

  function openFolder(key) {
    if (level === 0) setPath({ sem: key, mk: '', bab: '' });
    else if (level === 1) setPath({ ...path, mk: key, bab: '' });
    else setPath({ ...path, bab: key });
  }
  const goBack = () => setPath(crumbs[crumbs.length - 2].to);

  const cardIcon = level === 0 ? 'folder' : level === 1 ? 'book' : 'bookmark';
  const cardTitle = (k) => (level === 0 ? `Semester ${k}` : level === 2 ? `Bab ${k}` : k);
  const cardLines = (g) => [
    `${g.count} file`,
    level === 0 ? `${g.subs.size} mata kuliah` : level === 1 ? `${g.subs.size} bab` : null,
  ].filter(Boolean);

  return (
    <main className="sheet">
      <header className="bar">
        <button className="sq" onClick={() => { setShowAcct(!showAcct); setShowSearch(false); }} aria-label="Akun" aria-expanded={showAcct}>
          <Icon name="gear" />
        </button>
        <button className="sq" onClick={() => { setShowSearch(!showSearch); setShowAcct(false); if (showSearch) setQ(''); }} aria-label="Cari file" aria-expanded={showSearch}>
          <Icon name="search" />
        </button>
      </header>

      {showAcct && (
        <div className="pop">
          <p>Drive: <b>{me.email}</b></p>
          <div className="row-btns">
            <a className="btn small" href="/api/auth/login">Ganti akun</a>
            <button className="btn small" onClick={onLogout}>Keluar</button>
          </div>
        </div>
      )}

      {showSearch && (
        <input className="field search" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama file atau mata kuliah" aria-label="Cari file" />
      )}

      <h1>Unggah sekali.<br />Temukan kapan saja.</h1>

      <button className="upbar" onClick={() => { setShowUpload(true); setShowAcct(false); }}>
        <span className="upbar-text"><Icon name="upload" size={20} /> Unggah materi baru</span>
        <span className="plus" aria-hidden="true"><Icon name="plus" size={26} /></span>
      </button>

      <div className="views" role="group" aria-label="Tampilan">
        <button aria-pressed={view === 'aktif'} onClick={() => changeView('aktif')}>Di Drive</button>
        <button aria-pressed={view === 'terhapus'} onClick={() => changeView('terhapus')}>Terhapus</button>
      </div>

      {view === 'terhapus' && (
        <p className="note">
          File yang kamu hapus dari Drive masuk Tempat Sampah dan tetap muncul di sini selama 30 hari. Setelah itu Google menghapusnya permanen dan file tidak bisa dipulihkan.
        </p>
      )}

      {error && <p className="msg bad">{error}</p>}

      {results ? (
        <section>
          <h2>Hasil pencarian</h2>
          {results.length === 0 ? <p className="empty">Tidak ada file yang cocok.</p> : (
            <ul className="list">{results.map((f) => <FileRow key={f.id} f={f} view={view} act={act} showPath />)}</ul>
          )}
        </section>
      ) : (
        <section>
          {level === 0 ? (
            <h2>Folder materi</h2>
          ) : (
            <div className="crumbs">
              <button className="sq small" onClick={goBack} aria-label="Kembali"><Icon name="back" size={20} /></button>
              <nav aria-label="Lokasi folder">
                {crumbs.map((c, i) => (
                  <button key={i} className="crumb" aria-current={i === crumbs.length - 1 ? 'page' : undefined} onClick={() => setPath(c.to)}>{c.label}</button>
                ))}
              </nav>
            </div>
          )}

          {loading ? (
            <p className="empty">Memuat…</p>
          ) : level === 3 ? (
            inScope.length === 0 ? <p className="empty">Folder ini kosong.</p> : (
              <ul className="list">{inScope.map((f) => <FileRow key={f.id} f={f} view={view} act={act} />)}</ul>
            )
          ) : folders.length === 0 ? (
            <p className="empty">
              {view === 'aktif' ? 'Belum ada materi. Tekan Unggah materi baru untuk mulai.' : 'Tidak ada file di Tempat Sampah Drive.'}
            </p>
          ) : (
            <div className="grid">
              {folders.map((g) => (
                <button key={g.key} className="folder" style={{ '--c': colorFor(g.key) }} onClick={() => openFolder(g.key)}>
                  <span className="tab" aria-hidden="true" />
                  <span className="card">
                    <span className="ico"><Icon name={cardIcon} /></span>
                    <span className="lines">
                      {cardLines(g).map((l) => <span key={l}>{l}</span>)}
                      {g.isNew && view === 'aktif' && <span className="new">BARU</span>}
                    </span>
                    <span className="ftitle">{cardTitle(g.key)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {showUpload && (
        <UploadSheet
          existing={view === 'aktif' ? files : []}
          initial={path}
          onClose={() => setShowUpload(false)}
          onDone={({ semester, matkul, bab }) => {
            setShowUpload(false);
            setQ('');
            setPath({ sem: semester, mk: matkul, bab });
            if (view === 'aktif') load();
            else setView('aktif');
          }}
        />
      )}
    </main>
  );
}

function FileRow({ f, view, act, showPath }) {
  return (
    <li className="file">
      <div className="info">
        <div className="name">{f.name}</div>
        <div className="meta">
          {showPath ? `Semester ${f.semester} / ${f.matkul} / Bab ${f.bab} · ` : ''}
          {fmtDate(f.createdTime)}{f.size ? ` · ${fmtSize(f.size)}` : ''}
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
  );
}

function UploadSheet({ existing, initial, onClose, onDone }) {
  const [semester, setSemester] = useState(initial.sem || '1');
  const [matkul, setMatkul] = useState(initial.mk || '');
  const [bab, setBab] = useState(initial.bab || '1');
  const [picked, setPicked] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
      onDone({ semester, matkul: cleanName(matkul), bab: String(bab).trim() });
    } catch (err) {
      setMsg(err.message || 'Upload gagal.');
      setBusy(false);
    }
  }

  const path = `Materi Kuliah / Semester ${semester} / ${matkul.trim() || '…'} / Bab ${bab || '…'}`;

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="dialog" onSubmit={submit} role="dialog" aria-modal="true" aria-label="Unggah materi">
        <div className="dlg-head">
          <h2>Unggah materi</h2>
          <button type="button" className="sq small" onClick={onClose} aria-label="Tutup"><Icon name="x" size={20} /></button>
        </div>

        <label className="f">Semester
          <select className="field" value={semester} onChange={(e) => setSemester(e.target.value)}>
            {SEMESTERS.map((s) => <option key={s} value={s}>Semester {s}</option>)}
          </select>
        </label>
        <label className="f">Mata kuliah
          <input className="field" value={matkul} onChange={(e) => setMatkul(e.target.value)} list="mk-list" placeholder="Contoh: Kalkulus" required />
          <datalist id="mk-list">{knownMk.map((m) => <option key={m} value={m} />)}</datalist>
        </label>
        <label className="f">Bab
          <input className="field" type="number" min="1" max="99" value={bab} onChange={(e) => setBab(e.target.value)} required />
        </label>

        <label className="drop">
          <input type="file" multiple required onChange={(e) => setPicked([...e.target.files])} />
          <small>{picked.length ? `${picked.length} file dipilih` : 'PDF, PPT, Word, gambar, atau file apa pun dari WhatsApp'}</small>
        </label>

        <p className="target">Disimpan di: <code>{path}</code></p>
        <button className="btn primary big" disabled={busy}>{busy ? 'Mengunggah…' : 'Unggah ke Drive'}</button>
        {msg && <p className="msg bad">{msg}</p>}
      </form>
    </div>
  );
}
