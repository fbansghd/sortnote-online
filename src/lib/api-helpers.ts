import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions';
import { NextResponse } from 'next/server';

type AuthSuccess = { userId: string };

export async function requireAuth(): Promise<AuthSuccess | NextResponse> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? session?.user?.email ?? null;
  if (!session || !userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  return { userId };
}
