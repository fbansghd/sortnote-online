import { supabaseAdmin } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import type { CreateTaskRequest } from '@/types/api';
import { requireAuth } from '@/lib/api-helpers';

// POST /api/tasks - タスク作成（DBがIDを発行）
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  let body: CreateTaskRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { categoryId, text } = body;
  if (!categoryId || !text || typeof text !== 'string') {
    return NextResponse.json({ error: '{ categoryId, text } required' }, { status: 400 });
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

  const { data: existing } = await supabaseAdmin
    .from('tasks')
    .select('sort_index')
    .eq('category_id', categoryId)
    .order('sort_index', { ascending: false })
    .limit(1);

  const nextSortIndex = existing && existing.length > 0 ? (existing[0].sort_index ?? 0) + 1 : 0;

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .insert({ category_id: categoryId, text: text.trim(), done: false, sort_index: nextSortIndex })
    .select()
    .single();

  if (error) {
    console.error('Task insert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    data: { id: data.id, text: data.text, done: data.done, created_at: data.created_at },
  }, { status: 201 });
}
