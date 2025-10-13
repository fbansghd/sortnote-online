import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'
import { supabaseAdmin } from '@/lib/supabase-server'

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
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? session?.user?.email ?? null
  if (!session || !userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json()
  const memos = body.memos
  if (!Array.isArray(memos)) {
    return NextResponse.json({ error: 'Invalid memos payload' }, { status: 400 })
  }

  // We'll perform deletions and inserts inside a transaction-like sequence.
  // Supabase JS doesn't expose multi-statement transactions for Postgres directly,
  // so we emulate by deleting existing rows for the user and inserting new ones.
  try {
    // Delete existing tasks and categories for user
    await supabaseAdmin.from('tasks').delete().eq('user_id', userId)
    await supabaseAdmin.from('categories').delete().eq('user_id', userId)

    // Insert categories and collect their IDs (if id provided, keep it; otherwise generated)
    for (let i = 0; i < memos.length; i++) {
      const cat = memos[i]
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

      // Insert tasks for this category
  // @ts-expect-error - allow flexible task object shape from client
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