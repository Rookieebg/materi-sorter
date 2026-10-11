import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const s = getSession();
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json({ email: s.email, name: s.name });
}
