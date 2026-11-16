import { getSession } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await getSession();
    return NextResponse.json({ id: session?.id || null, role: session?.role || null });
  } catch (error) {
    return NextResponse.json({ id: null, role: null });
  }
}
