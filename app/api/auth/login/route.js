import { NextResponse } from 'next/server';
import { oauthClient, SCOPES } from '@/lib/google';

export const dynamic = 'force-dynamic';

// select_account = selalu tampilkan pilihan akun (dipakai juga untuk "Ganti akun")
export async function GET() {
  const url = oauthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent select_account',
    scope: SCOPES,
  });
  return NextResponse.redirect(url);
}
