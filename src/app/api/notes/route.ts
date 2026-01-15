import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'
import { supabaseAdmin } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server';

// GET: return composed categories with tasks for the authenticated user
export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? session?.user?.email ?? null
  if (!session || !userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // Fetch categories and tasks
  const { data: categories, error: catErr } = await supabaseAdmin
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('sort_index', { ascending: true })

  if (catErr) {
    console.error('Supabase categories select error:', catErr)
    return NextResponse.json({ error: catErr.message }, { status: 500 })
  }

  const { data: tasks, error: taskErr } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (taskErr) {
    console.error('Supabase tasks select error:', taskErr)
    return NextResponse.json({ error: taskErr.message }, { status: 500 })
  }

  // Compose memos: categories with tasks array and collapsed state
  const composed = categories.map((cat) => ({
    id: cat.id,
    category: cat.title,
    sort_index: cat.sort_index,
    collapsed: cat.collapsed ?? false,
    tasks: tasks.filter((t) => t.category_id === cat.id).map((t) => ({
      id: t.id,
      text: t.text,
      done: t.done,
      created_at: t.created_at,
    })),
  }))

  return NextResponse.json({ ok: true, memos: composed })
}

// POST: accept a payload { memos: [{ id?, category, tasks:[{id?, text, done}] , sort_index? }], collapsedCategories?: string[] }
// and replace the user's categories/tasks with the provided structure in a transaction
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

  // 既存カテゴリ・タスク取得
  const { data: existingCats } = await supabaseAdmin
    .from('categories')
    .select('id')
    .eq('user_id', userId);

  const existingCatIds = new Set((existingCats ?? []).map(c => c.id));
  const incomingCatIds = new Set(rawMemos.map(c => c.id).filter(Boolean));

  const { data: existingTasks } = await supabaseAdmin
    .from('tasks')
    .select('id, category_id')
    .eq('user_id', userId);

  const existingTaskIds = new Set((existingTasks ?? []).map(t => t.id));

  // カテゴリー削除（DBにあるが送信されていないID）
  const toDeleteCatIds = [...existingCatIds].filter(id => !incomingCatIds.has(id));
  if (toDeleteCatIds.length > 0) {
    await supabaseAdmin.from('tasks').delete().in('category_id', toDeleteCatIds);
    await supabaseAdmin.from('categories').delete().in('id', toDeleteCatIds);
  }

  // カテゴリーの一括UPDATE/INSERT（バッチ処理）
  const categoriesToUpdate: Array<{ id: string; title: string; sort_index: number; collapsed: boolean }> = [];
  const categoriesToInsert: Array<{ user_id: string; title: string; sort_index: number; collapsed: boolean }> = [];
  const categoryIdMap = new Map<number, number>(); // 一時ID → 新規カテゴリーのインデックス

  for (const [i, c] of rawMemos.entries()) {
    if (c.id && existingCatIds.has(c.id)) {
      // 既存カテゴリー：UPDATE用配列に追加
      categoriesToUpdate.push({
        id: c.id,
        title: c.category,
        sort_index: i,
        collapsed: !!c.collapsed,
      });
    } else {
      // 新規カテゴリー：INSERT用配列に追加
      categoriesToInsert.push({
        user_id: userId,
        title: c.category,
        sort_index: i,
        collapsed: !!c.collapsed,
      });
      categoryIdMap.set(i, categoriesToInsert.length - 1);
    }
  }

  // カテゴリーのUPDATE（upsertで一括処理）
  if (categoriesToUpdate.length > 0) {
    await supabaseAdmin.from('categories').upsert(categoriesToUpdate);
  }

  // カテゴリーのINSERT（一括処理）
  let newCategoryIds: Array<{ id: string; sort_index: number }> = [];
  if (categoriesToInsert.length > 0) {
    const { data: insertedCats } = await supabaseAdmin
      .from('categories')
      .insert(categoriesToInsert)
      .select('id, sort_index');
    newCategoryIds = insertedCats ?? [];
  }

  // 新規カテゴリーのIDをrawMemosに反映
  for (const [i, c] of rawMemos.entries()) {
    if (!c.id) {
      const inserted = newCategoryIds.find(nc => nc.sort_index === i);
      if (inserted) {
        c.id = inserted.id;
      }
    }
  }

  // タスクの削除・更新・挿入を一括処理
  const incomingTaskIds = new Set(
    rawMemos.flatMap(c => (c.tasks || []).map(t => t.id).filter(Boolean))
  );
  const toDeleteTaskIds = [...existingTaskIds].filter(id => !incomingTaskIds.has(id));
  if (toDeleteTaskIds.length > 0) {
    await supabaseAdmin.from('tasks').delete().in('id', toDeleteTaskIds);
  }

  const tasksToUpdate: Array<{ id: string; text: string; done: boolean }> = [];
  const tasksToInsert: Array<{ user_id: string; category_id: string; text: string; done: boolean }> = [];

  for (const c of rawMemos) {
    const categoryId = c.id;
    if (!categoryId) continue; // IDがない場合はスキップ（新規カテゴリーのIDは既に反映済み）

    const incomingTasks = Array.isArray(c.tasks) ? c.tasks : [];

    for (const t of incomingTasks) {
      if (t.id && existingTaskIds.has(t.id)) {
        // 既存タスク：UPDATE用配列に追加
        tasksToUpdate.push({
          id: t.id,
          text: t.text,
          done: !!t.done,
        });
      } else {
        // 新規タスク：INSERT用配列に追加
        tasksToInsert.push({
          user_id: userId,
          category_id: categoryId,
          text: t.text ?? '',
          done: !!t.done,
        });
      }
    }
  }

  // タスクのUPDATE（upsertで一括処理）
  if (tasksToUpdate.length > 0) {
    await supabaseAdmin.from('tasks').upsert(tasksToUpdate);
  }

  // タスクのINSERT（一括処理）
  if (tasksToInsert.length > 0) {
    await supabaseAdmin.from('tasks').insert(tasksToInsert);
  }

  // 更新後の最新データを返す（カテゴリーID同期のため）
  const { data: updatedCats } = await supabaseAdmin
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('sort_index', { ascending: true });

  const { data: updatedTasks } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  const updatedMemos = (updatedCats ?? []).map((cat) => ({
    id: cat.id,
    category: cat.title,
    sort_index: cat.sort_index,
    collapsed: cat.collapsed ?? false,
    tasks: (updatedTasks ?? []).filter((t) => t.category_id === cat.id).map((t) => ({
      id: t.id,
      text: t.text,
      done: t.done,
      created_at: t.created_at,
    })),
  }));

  return NextResponse.json({ ok: true, memos: updatedMemos });
}

type TaskPayload = {
  id?: string;
  text: string;
  done: boolean;
};

type CategoryPayload = {
  id?: string;
  category: string;
  sort_index?: number;
  collapsed?: boolean;
  tasks: TaskPayload[];
};

type MemosPayload = {
  memos: CategoryPayload[];
};