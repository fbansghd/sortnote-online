import { supabaseAdmin } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import type { UpdateTaskRequest } from '@/types/api';
import { requireAuth } from '@/lib/api-helpers';

// PATCH /api/tasks/[id] - タスク更新
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const { id } = await params;

  let body: UpdateTaskRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (body.text !== undefined) patch.text = body.text;
  if (body.done !== undefined) patch.done = body.done;
  if (body.categoryId !== undefined) patch.category_id = body.categoryId;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  // タスクが認証済みユーザーのものか確認（categoriesテーブル経由）
  const { data: task, error: findErr } = await supabaseAdmin
    .from('tasks')
    .select('id, categories!inner(user_id)')
    .eq('id', id)
    .eq('categories.user_id', userId)
    .single();

  if (findErr || !task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Task update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    data: { id: data.id, text: data.text, done: data.done, created_at: data.created_at },
  });
}

// DELETE /api/tasks/[id] - タスク削除
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const { id } = await params;

  // タスクが認証済みユーザーのものか確認
  const { data: task, error: findErr } = await supabaseAdmin
    .from('tasks')
    .select('id, categories!inner(user_id)')
    .eq('id', id)
    .eq('categories.user_id', userId)
    .single();

  if (findErr || !task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const { error } = await supabaseAdmin.from('tasks').delete().eq('id', id);

  if (error) {
    console.error('Task delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
