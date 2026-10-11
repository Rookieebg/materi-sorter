import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { driveFor } from '@/lib/google';

// PATCH { action: 'restore' | 'trash' }
export async function PATCH(req, { params }) {
  const s = getSession();
  if (!s) return NextResponse.json({ error: 'Sesi habis. Masuk lagi.' }, { status: 401 });
  try {
    const { action } = await req.json();
    if (!['restore', 'trash'].includes(action))
      return NextResponse.json({ error: 'Aksi tidak dikenal.' }, { status: 400 });
    await driveFor(s).files.update({
      fileId: params.id,
      requestBody: { trashed: action === 'trash' },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'File tidak ditemukan. Mungkin sudah dihapus permanen dari Drive.' },
      { status: 404 }
    );
  }
}
