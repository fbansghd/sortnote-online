import { supabaseAdmin } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import type { CreateCategoryRequest } from '@/types/api';
import { requireAuth } from '@/lib/api-helpers';
import { composeMemos } from '@/lib/db-helpers';

// POST /api/categories - カテゴリー作成（DBがIDを発行）
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  let body: CreateCategoryRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { title } = body;
  if (!title || typeof title !== 'string') {
    return NextResponse.json({ error: '{ title } required' }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from('categories')
    .select('sort_index')
    .eq('user_id', userId)
    .order('sort_index', { ascending: false })
    .limit(1);

  const nextSortIndex = existing && existing.length > 0 ? (existing[0].sort_index ?? 0) + 1 : 0;

  const { data, error } = await supabaseAdmin
    .from('categories')
    .insert({ user_id: userId, title, sort_index: nextSortIndex, collapsed: false })
    .select()
    .single();

  if (error) {
    console.error('Category insert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: composeMemos([data], [])[0] }, { status: 201 });
}
