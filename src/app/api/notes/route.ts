import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'
import { supabaseAdmin } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'; // ← NextRequest を追加

// GET: return composed categories with tasks for the authenticated user
export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? session?.user?.email ?? null
  if (!session || !userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

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

  return NextResponse.json({ ok: true, memos: composed })
}

// POST: accept a payload { memos: [{ id?, category, tasks:[{id?, text, done}] , sort_index? }] }
// and replace the user's categories/tasks with the provided structure in a transaction
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? session?.user?.email ?? null
  if (!session || !userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json()
  const incoming = Array.isArray(body?.memos) ? body.memos : null

  // バリデーション
  if (!Array.isArray(incoming)) {
    return NextResponse.json({ error: 'Invalid payload: memos must be array' }, { status: 400 })
  }

  // 既存があるのに空配列で上書きするのをブロック（categories/tasksベース）
  if (incoming.length === 0) {
    const { count: catCount, error: catCountErr } = await supabaseAdmin
      .from('categories')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)

    const { count: taskCount, error: taskCountErr } = await supabaseAdmin
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (catCountErr || taskCountErr) {
      console.error('Count error:', catCountErr || taskCountErr)
      return NextResponse.json({ error: 'Count failed' }, { status: 500 })
    }

    if ((catCount ?? 0) > 0 || (taskCount ?? 0) > 0) {
      return NextResponse.json({ error: 'Refuse empty overwrite' }, { status: 409 })
    }
    // 既存がないなら空保存=初期化は通す
  }

  try {
    // 置換方式：既存削除 → 挿入
    await supabaseAdmin.from('tasks').delete().eq('user_id', userId)
    await supabaseAdmin.from('categories').delete().eq('user_id', userId)

    for (let i = 0; i < incoming.length; i++) {
      const cat = incoming[i]
      const title = cat.category || cat.title || 'Untitled'
      const sort_index = cat.sort_index ?? i

      const { data: insertedCats, error: insertCatErr } = await supabaseAdmin
        .from('categories')
        .insert([{ user_id: userId, title, sort_index }])
        .select()

      if (insertCatErr) {
        console.error('Insert category error:', insertCatErr)
        return NextResponse.json({ error: insertCatErr.message }, { status: 500 })
      }

      const newCatId = insertedCats?.[0]?.id

      // @ts-expect-error - flexible task shape
      const tasksToInsert = (Array.isArray(cat.tasks) ? cat.tasks : []).map((t) => ({
        user_id: userId,
        category_id: newCatId,
        text: t.text ?? t.title ?? '',
        done: !!t.done,
      }))

      if (tasksToInsert.length > 0) {
        const { error: insertTaskErr } = await supabaseAdmin.from('tasks').insert(tasksToInsert)
        if (insertTaskErr) {
          console.error('Insert tasks error:', insertTaskErr)
          return NextResponse.json({ error: insertTaskErr.message }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Server sync error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}