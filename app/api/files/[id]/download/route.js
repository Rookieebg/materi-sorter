import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { driveFor } from '@/lib/google';

export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  const s = getSession();
  if (!s) return NextResponse.json({ error: 'Sesi habis. Masuk lagi.' }, { status: 401 });
  try {
    const drive = driveFor(s);
    const meta = await drive.files.get({ fileId: params.id, fields: 'name,mimeType' });
    const r = await drive.files.get(
      { fileId: params.id, alt: 'media' },
      { responseType: 'arraybuffer' }
    );
    return new Response(r.data, {
      headers: {
        'Content-Type': meta.data.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(meta.data.name)}`,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'File tidak bisa diunduh.' }, { status: 404 });
  }
}
