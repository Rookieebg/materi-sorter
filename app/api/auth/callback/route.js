import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { oauthClient } from '@/lib/google';
import { sessionCookie } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const base = process.env.APP_URL;
  const code = new URL(req.url).searchParams.get('code');
  if (!code) return NextResponse.redirect(`${base}/?error=login`);
  try {
    const client = oauthClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);
    if (!tokens.refresh_token) return NextResponse.redirect(`${base}/?error=login`);
    const { data } = await google.oauth2({ version: 'v2', auth: client }).userinfo.get();
    const res = NextResponse.redirect(base);
    res.cookies.set(
      sessionCookie({ refresh_token: tokens.refresh_token, email: data.email, name: data.name })
    );
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.redirect(`${base}/?error=login`);
  }
}
