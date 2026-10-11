import { NextResponse } from 'next/server';
import { Readable } from 'stream';
import { getSession } from '@/lib/session';
import { driveFor } from '@/lib/google';
import { APP_TAG, ROOT_NAME, ensureFolderPath, listFiles } from '@/lib/drive';

export const dynamic = 'force-dynamic';

const clean = (s, max = 80) => String(s || '').replace(/[\/\\]/g, '-').trim().slice(0, max);
const unauthorized = () => NextResponse.json({ error: 'Sesi habis. Masuk lagi.' }, { status: 401 });

export async function GET(req) {
  const s = getSession();
  if (!s) return unauthorized();
  try {
    const trashed = new URL(req.url).searchParams.get('trashed') === '1';
    return NextResponse.json({ files: await listFiles(driveFor(s), trashed) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Gagal membaca Google Drive.' }, { status: 500 });
  }
}

export async function POST(req) {
  const s = getSession();
  if (!s) return unauthorized();
  try {
    const form = await req.formData();
    const semester = clean(form.get('semester'), 3);
    const matkul = clean(form.get('matkul'));
    const bab = clean(form.get('bab'), 3);
    const files = form.getAll('files').filter((f) => typeof f !== 'string' && f.size > 0);

    if (!semester || !matkul || !bab)
      return NextResponse.json({ error: 'Isi semester, mata kuliah, dan bab.' }, { status: 400 });
    if (!files.length)
      return NextResponse.json({ error: 'Pilih minimal satu file.' }, { status: 400 });

    const drive = driveFor(s);
    const parentId = await ensureFolderPath(drive, [
      ROOT_NAME,
      `Semester ${semester}`,
      matkul,
      `Bab ${bab}`,
    ]);

    for (const f of files) {
      await drive.files.create({
        requestBody: {
          name: f.name,
          parents: [parentId],
          appProperties: { app: APP_TAG, semester, matkul, bab },
        },
        media: {
          mimeType: f.type || 'application/octet-stream',
          body: Readable.from(Buffer.from(await f.arrayBuffer())),
        },
        fields: 'id',
      });
    }
    return NextResponse.json({ ok: true, count: files.length });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Upload ke Google Drive gagal.' }, { status: 500 });
  }
}
