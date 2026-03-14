import { supabaseAdmin } from '@/lib/supabase-server';
import type { CategoryPayload } from '@/types/api';

type DbCategory = {
  id: string;
  user_id: string;
  title: string;
  sort_index: number;
  collapsed: boolean;
  created_at: string;
};

type DbTask = {
  id: string;
  category_id: string;
  text: string;
  done: boolean;
  sort_index: number;
  created_at: string;
};

// カテゴリーとタスクをmemos形式に合成
export function composeMemos(cats: DbCategory[], tasks: DbTask[]) {
  return cats.map((cat) => ({
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
  }));
}

// カテゴリーの同期（upsert + DB側削除）
// クライアントがIDを発行するため、全カテゴリーは常にIDを持つ
export async function syncCategories(
  userId: string,
  rawMemos: CategoryPayload[],
): Promise<void> {
  // 全カテゴリーをupsert
  if (rawMemos.length > 0) {
    const { error } = await supabaseAdmin.from('categories').upsert(
      rawMemos.map((c, i) => ({
        id: c.id,
        user_id: userId,
        title: c.category,
        sort_index: i,
        collapsed: !!c.collapsed,
      })),
      { onConflict: 'id' }
    );
    if (error) throw new Error(`カテゴリーのupsertに失敗: ${error.message}`);
  }

  // 送信されていないカテゴリーをDB側で削除（ON DELETE CASCADEでタスクも自動削除）
  const incomingCatIds = rawMemos.map(c => c.id);
  if (incomingCatIds.length > 0) {
    const { error } = await supabaseAdmin.from('categories')
      .delete()
      .eq('user_id', userId)
      .not('id', 'in', `(${incomingCatIds.join(',')})`);
    if (error) throw new Error(`カテゴリーの削除に失敗: ${error.message}`);
  } else {
    // 全カテゴリーが削除された場合
    const { error } = await supabaseAdmin.from('categories').delete().eq('user_id', userId);
    if (error) throw new Error(`カテゴリーの全削除に失敗: ${error.message}`);
  }
}

// タスクの同期（upsert + DB側削除）
// クライアントがIDを発行するため、全タスクは常にIDを持つ
export async function syncTasks(
  rawMemos: CategoryPayload[],
): Promise<void> {
  const allCatIds = rawMemos.map(c => c.id);
  const incomingTaskIds = rawMemos.flatMap(c => (c.tasks || []).map(t => t.id));

  // 送信されていないタスクをDB側で削除（upsertより先に実行）
  if (allCatIds.length > 0) {
    if (incomingTaskIds.length > 0) {
      const { error } = await supabaseAdmin.from('tasks')
        .delete()
        .in('category_id', allCatIds)
        .not('id', 'in', `(${incomingTaskIds.join(',')})`);
      if (error) throw new Error(`タスクの削除に失敗: ${error.message}`);
    } else {
      // 全タスクが削除された場合
      const { error } = await supabaseAdmin.from('tasks').delete().in('category_id', allCatIds);
      if (error) throw new Error(`タスクの全削除に失敗: ${error.message}`);
    }
  }

  // 全タスクをupsert
  const allTasks = rawMemos.flatMap((c) =>
    (Array.isArray(c.tasks) ? c.tasks : []).map((t, taskIndex) => ({
      id: t.id,
      category_id: c.id,
      text: t.text ?? '',
      done: !!t.done,
      sort_index: taskIndex,
    }))
  );

  if (allTasks.length > 0) {
    const { error } = await supabaseAdmin.from('tasks').upsert(allTasks, { onConflict: 'id' });
    if (error) throw new Error(`タスクのupsertに失敗: ${error.message}`);
  }
}
