import { supabaseAdmin } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import type { ReorderCategoriesRequest } from '@/types/api';
import { requireAuth } from '@/lib/api-helpers';

// PATCH /api/categories/reorder - カテゴリーの並び順更新
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  let body: ReorderCategoriesRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { ids } = body;
  if (!Array.isArray(ids)) {
    return NextResponse.json({ error: '{ ids: string[] } required' }, { status: 400 });
  }

  const results = await Promise.all(
    ids.map((id, index) =>
      supabaseAdmin.from('categories').update({ sort_index: index }).eq('id', id).eq('user_id', userId)
    )
  );

  const failed = results.find(r => r.error);
  if (failed?.error) {
    console.error('Category reorder error:', failed.error);
    return NextResponse.json({ error: failed.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
