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

  // Compose memos: categories with tasks array
  const composed = categories.map((cat) => ({
    id: cat.id,
    category: cat.title,
    sort_index: cat.sort_index,
    tasks: tasks.filter((t) => t.category_id === cat.id).map((t) => ({
      id: t.id,
      text: t.text,
      done: t.done,
      created_at: t.created_at,
    })),
  }))

  // 追加: 折り畳みキーを取得
  const { data: prefRow } = await supabaseAdmin
    .from('ui_prefs')
    .select('collapsed_titles')
    .eq('user_id', userId)
    .maybeSingle();

  const collapsedTitles: string[] = Array.isArray(prefRow?.collapsed_titles)
    ? prefRow!.collapsed_titles as string[]
    : [];

  return NextResponse.json({ ok: true, memos: composed, collapsedTitles })
}

// POST: idベースでUPDATE/INSERT/DELETEする
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

  const rawMemos = (body as { memos?: unknown })?.memos;
  if (!Array.isArray(rawMemos)) {
    return NextResponse.json({ error: 'Invalid payload: { memos: [] } required' }, { status: 400 });
  }

  if (rawMemos.length === 0) {
    // 空配列なら必ず全削除
    await supabaseAdmin.from('tasks').delete().eq('user_id', userId);
    await supabaseAdmin.from('categories').delete().eq('user_id', userId);
    return NextResponse.json({ ok: true });
  }

  // 追加: タスク用の型ガード
  const isRawTask = (v: unknown): v is { text?: unknown; done?: unknown } =>
    typeof v === 'object' && v !== null;

  // IDは完全に無視して正規化（index順を保持）
  const cats = rawMemos.map((c: Record<string, unknown>, i: number) => {
    const title = String(c?.category ?? c?.title ?? 'Untitled');
    const sort_index = Number.isFinite(c?.sort_index as number) ? (c.sort_index as number) : i;

    const tasksRaw: unknown[] = Array.isArray(c?.tasks) ? (c.tasks as unknown[]) : [];
    const tasks = tasksRaw
      .filter(isRawTask)
      .map((t) => ({ text: String(t.text ?? ''), done: !!t.done }))
      .filter((t) => t.text.length > 0);

    return { title, sort_index, tasks };
  });

  // 置換（tasks→categories の順で削除してから insert）
  const delTasks = await supabaseAdmin.from('tasks').delete().eq('user_id', userId);
  if (delTasks.error) return NextResponse.json({ error: delTasks.error.message }, { status: 500 });
  const delCats = await supabaseAdmin.from('categories').delete().eq('user_id', userId);
  if (delCats.error) return NextResponse.json({ error: delCats.error.message }, { status: 500 });

  // カテゴリ挿入（返却行は入力順に対応）
  const { data: insertedCats, error: catErr } = await supabaseAdmin
    .from('categories')
    .insert(cats.map(c => ({ user_id: userId, title: c.title, sort_index: c.sort_index })))
    .select('id');
  if (catErr) return NextResponse.json({ error: catErr.message }, { status: 500 });

  // 新しい category_id に付け替えてタスク挿入（index対応）
  const taskRows = cats.flatMap((c, i) => {
    const cid = insertedCats?.[i]?.id;
    if (!cid) return [];
    return c.tasks.map(t => ({ user_id: userId, category_id: cid, text: t.text, done: t.done }));
  });

  if (taskRows.length > 0) {
    const { error: taskErr } = await supabaseAdmin
      .from('tasks')
      .insert(taskRows); // ← upsert + onConflict を廃止
    if (taskErr) return NextResponse.json({ error: taskErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

type TaskPayload = {
  text: string;
  done: boolean;
};

type CategoryPayload = {
  category: string;
  sort_index?: number;
  tasks: TaskPayload[];
};

type MemosPayload = {
  memos: CategoryPayload[];
};