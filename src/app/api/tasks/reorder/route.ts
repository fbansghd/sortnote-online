import { supabaseAdmin } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import type { ReorderTasksRequest } from '@/types/api';
import { requireAuth } from '@/lib/api-helpers';

// PATCH /api/tasks/reorder - タスクの並び順更新
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  let body: ReorderTasksRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { categoryId, ids } = body;
  if (!categoryId || !Array.isArray(ids)) {
    return NextResponse.json({ error: '{ categoryId, ids: string[] } required' }, { status: 400 });
  }

  const { data: category, error: catErr } = await supabaseAdmin
    .from('categories')
    .select('id')
    .eq('id', categoryId)
    .eq('user_id', userId)
    .single();

  if (catErr || !category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  const results = await Promise.all(
    ids.map((id, index) =>
      supabaseAdmin.from('tasks').update({ sort_index: index }).eq('id', id).eq('category_id', categoryId)
    )
  );

  const failed = results.find(r => r.error);
  if (failed?.error) {
    console.error('Task reorder error:', failed.error);
    return NextResponse.json({ error: failed.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
