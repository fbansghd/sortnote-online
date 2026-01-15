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

  // カテゴリーごとにUPDATE/INSERT
  for (const [i, c] of rawMemos.entries()) {
    let categoryId = c.id;
    if (categoryId && existingCatIds.has(categoryId)) {
      // UPDATE category
      await supabaseAdmin.from('categories').update({
        title: c.category,
        sort_index: i,
        collapsed: !!c.collapsed,
      }).eq('id', categoryId);
    } else {
      // INSERT category
      const { data: newCat } = await supabaseAdmin.from('categories').insert({
        user_id: userId,
        title: c.category,
        sort_index: i,
        collapsed: !!c.collapsed,
      }).select('id').single();
      categoryId = newCat?.id;
    }

    // タスクIDリスト
    const incomingTasks = Array.isArray(c.tasks) ? c.tasks : [];
    const incomingTaskIds = new Set(incomingTasks.map(t => t.id).filter(Boolean));
    const existingTasksInCat = (existingTasks ?? []).filter(t => t.category_id === categoryId);
    const existingTaskIdsInCat = new Set(existingTasksInCat.map(t => t.id));

    // タスク削除（DBにあるが送信されていないID）
    const toDeleteTaskIds = [...existingTaskIdsInCat].filter(id => !incomingTaskIds.has(id));
    if (toDeleteTaskIds.length > 0) {
      await supabaseAdmin.from('tasks').delete().in('id', toDeleteTaskIds);
    }

    // タスクUPDATE/INSERT
    for (const t of incomingTasks) {
      if (t.id && existingTaskIds.has(t.id)) {
        // UPDATE
        await supabaseAdmin.from('tasks').update({
          text: t.text,
          done: !!t.done,
        }).eq('id', t.id);
      } else {
        // INSERT
        await supabaseAdmin.from('tasks').insert({
          user_id: userId,
          category_id: categoryId,
          text: t.text ?? '',
          done: !!t.done,
        });
      }
    }
  }

  // 更新後の最新データを返す
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