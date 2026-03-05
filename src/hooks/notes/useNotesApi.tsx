import type { Memo, SaveResult, LoadResult } from '@/types/notes';

/**
 * API通信を管理するカスタムフック
 * サーバーへのデータ保存・読み込みを担当
 */
export function useNotesApi() {
  /**
   * メモデータをサーバーに保存
   */
  const saveNotesToServer = async (dataToSave: Memo[]): Promise<SaveResult> => {
    try {
      const cleaned = (Array.isArray(dataToSave) ? dataToSave : []).map((c, i) => ({
        id: c.id,
        category: c.category,
        sort_index: i,
        collapsed: !!c.collapsed,
        tasks: (Array.isArray(c.tasks) ? c.tasks : []).map(t => ({
          id: t.id,
          text: t.text ?? '',
          done: !!t.done,
        })),
      }));

      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memos: cleaned }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Save failed');
      return { ok: true, memos: data?.memos };
    } catch (err) {
      console.error('Save failed:', err);
      return { ok: false, error: String(err) };
    }
  };

  /**
   * サーバーからメモデータを読み込み
   */
  const loadNotesFromServer = async (): Promise<LoadResult> => {
    try {
      const res = await fetch('/api/data');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Load failed');

      const serverMemos = data?.memos;
      return { ok: true, memos: serverMemos };
    } catch (err) {
      console.error('Load failed:', err);
      return { ok: false, error: String(err) };
    }
  };

  return {
    saveNotesToServer,
    loadNotesFromServer,
  };
}
