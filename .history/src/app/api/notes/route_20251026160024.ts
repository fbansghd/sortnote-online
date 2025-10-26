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

// POST: accept a payload { memos: [{ id?, category, tasks:[{id?, text, done}] , sort_index? }] }
// and replace the user's categories/tasks with the provided structure in a transaction
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? session?.user?.email ?? null;
  if (!session || !userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Empty or invalid JSON body' }, { status: 400 });
  }

  const rawMemos = (body as any)?.memos;
  if (!Array.isArray(rawMemos)) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  // 1. 既存データ取得
  const { data: existingCats } = await supabaseAdmin
    .from('categories')
    .select('id')
    .eq('user_id', userId);

  const existingCatIds = new Set((existingCats ?? []).map(c => c.id));
  const incomingCatIds = new Set(rawMemos.map(c => c.id).filter(Boolean));

  // 2. 削除: DBにあるが送信されていないID
  const toDeleteCatIds = [...existingCatIds].filter(id => !incomingCatIds.has(id));
  if (toDeleteCatIds.length > 0) {
    await supabaseAdmin.from('tasks').delete().in('category_id', toDeleteCatIds);
    await supabaseAdmin.from('categories').delete().in('id', toDeleteCatIds);
  }

  // 3. 更新/追加: 送信されたIDごとに
  for (const [i, c] of rawMemos.entries()) {
    if (c.id && existingCatIds.has(c.id)) {
      // UPDATE
      await supabaseAdmin.from('categories').update({
        title: c.category,
        sort_index: i,
      }).eq('id', c.id);

      // タスクも同様にidベースでUPDATE/INSERT/DELETE
      // ...（tasksのidベース更新処理を追加）...
    } else {
      // INSERT
      const { data: newCat } = await supabaseAdmin.from('categories').insert({
        user_id: userId,
        title: c.category,
        sort_index: i,
      }).select('id').single();
      // 新IDでtasksをINSERT
      // ...（tasksのINSERT処理を追加）...
    }
  }

  return NextResponse.json({ ok: true });
}