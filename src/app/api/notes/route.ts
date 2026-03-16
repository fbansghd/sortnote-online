import { supabaseAdmin } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-helpers';
import { composeMemos } from '@/lib/db-helpers';

// GET: 認証済みユーザーのカテゴリーとタスクを合成して返す
export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const { data: categories, error: catErr } = await supabaseAdmin
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('sort_index', { ascending: true });

  if (catErr) {
    console.error('Supabase categories select error:', catErr);
    return NextResponse.json({ error: catErr.message }, { status: 500 });
  }

  const catIds = categories.map(c => c.id);
  const { data: tasks, error: taskErr } = catIds.length > 0
    ? await supabaseAdmin.from('tasks').select('*').in('category_id', catIds).order('sort_index', { ascending: true })
    : { data: [], error: null };

  if (taskErr) {
    console.error('Supabase tasks select error:', taskErr);
    return NextResponse.json({ error: taskErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, memos: composeMemos(categories, tasks ?? []) });
}
