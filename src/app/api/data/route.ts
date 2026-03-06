import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'
import { supabaseAdmin } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server';
import type { MemosPayload } from '@/types/api';
import { composeMemos, syncCategories, syncTasks } from './helpers';

// ---- API Route ----

// GET: 認証済みユーザーのカテゴリーとタスクを合成して返す
export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? session?.user?.email ?? null
  if (!session || !userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // カテゴリーとタスクを取得
  const { data: categories, error: catErr } = await supabaseAdmin
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('sort_index', { ascending: true })

  if (catErr) {
    console.error('Supabase categories select error:', catErr)
    return NextResponse.json({ error: catErr.message }, { status: 500 })
  }

  const catIds = categories.map(c => c.id);
  const { data: tasks, error: taskErr } = catIds.length > 0
    ? await supabaseAdmin.from('tasks').select('*').in('category_id', catIds).order('sort_index', { ascending: true })
    : { data: [], error: null }

  if (taskErr) {
    console.error('Supabase tasks select error:', taskErr)
    return NextResponse.json({ error: taskErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, memos: composeMemos(categories, tasks ?? []) })
}

// POST: { memos: [{ id?, category, tasks:[{id?, text, done}], sort_index? }] } を受け取り、ユーザーのカテゴリー・タスクを更新する
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? session?.user?.email ?? null;
  if (!session || !userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  let body: MemosPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Empty or invalid JSON body' }, { status: 400 });
  }

  const rawMemos = body?.memos;
  if (!Array.isArray(rawMemos)) {
    return NextResponse.json({ error: 'Invalid payload: { memos: [] } required' }, { status: 400 });
  }

  // カテゴリーとタスクの同期
  try {
    await syncCategories(userId, rawMemos);
    await syncTasks(rawMemos);
  } catch (err) {
    console.error('同期に失敗:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  // 同期後の最新データを返す
  const { data: updatedCats } = await supabaseAdmin
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('sort_index', { ascending: true });

  const updatedCatIds = (updatedCats ?? []).map(c => c.id);
  const { data: updatedTasks } = updatedCatIds.length > 0
    ? await supabaseAdmin.from('tasks').select('*').in('category_id', updatedCatIds).order('sort_index', { ascending: true })
    : { data: [] };

  return NextResponse.json({ ok: true, memos: composeMemos(updatedCats ?? [], updatedTasks ?? []) });
}