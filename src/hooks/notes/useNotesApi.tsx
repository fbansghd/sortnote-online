import type { Memo, Task, LoadResult } from '@/types/notes';

/**
 * API通信を管理するカスタムフック
 */
export function useNotesApi() {
  /**
   * サーバーからメモデータを読み込み（初回ロード用）
   */
  const loadNotesFromServer = async (): Promise<LoadResult> => {
    try {
      const res = await fetch('/api/data');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Load failed');
      return { ok: true, memos: data?.memos };
    } catch (err) {
      console.error('Load failed:', err);
      return { ok: false, error: String(err) };
    }
  };

  // --- カテゴリー操作 ---

  const createCategory = async (title: string): Promise<{ ok: boolean; data?: Memo }> => {
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Create category failed');
      return { ok: true, data: data.data };
    } catch (err) {
      console.error('createCategory failed:', err);
      return { ok: false };
    }
  };

  const updateCategory = async (
    id: string,
    patch: { title?: string; collapsed?: boolean }
  ): Promise<{ ok: boolean; data?: Memo }> => {
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Update category failed');
      return { ok: true, data: data.data };
    } catch (err) {
      console.error('updateCategory failed:', err);
      return { ok: false };
    }
  };

  const deleteCategory = async (id: string): Promise<{ ok: boolean }> => {
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Delete category failed');
      return { ok: true };
    } catch (err) {
      console.error('deleteCategory failed:', err);
      return { ok: false };
    }
  };

  const reorderCategories = async (ids: string[]): Promise<{ ok: boolean }> => {
    try {
      const res = await fetch('/api/categories/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Reorder categories failed');
      return { ok: true };
    } catch (err) {
      console.error('reorderCategories failed:', err);
      return { ok: false };
    }
  };

  // --- タスク操作 ---

  const createTask = async (
    categoryId: string,
    text: string
  ): Promise<{ ok: boolean; data?: Task }> => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId, text }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Create task failed');
      return { ok: true, data: data.data };
    } catch (err) {
      console.error('createTask failed:', err);
      return { ok: false };
    }
  };

  const updateTask = async (
    id: string,
    patch: { text?: string; done?: boolean; categoryId?: string }
  ): Promise<{ ok: boolean; data?: Task }> => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Update task failed');
      return { ok: true, data: data.data };
    } catch (err) {
      console.error('updateTask failed:', err);
      return { ok: false };
    }
  };

  const deleteTask = async (id: string): Promise<{ ok: boolean }> => {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Delete task failed');
      return { ok: true };
    } catch (err) {
      console.error('deleteTask failed:', err);
      return { ok: false };
    }
  };

  const reorderTasks = async (
    categoryId: string,
    ids: string[]
  ): Promise<{ ok: boolean }> => {
    try {
      const res = await fetch('/api/tasks/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId, ids }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Reorder tasks failed');
      return { ok: true };
    } catch (err) {
      console.error('reorderTasks failed:', err);
      return { ok: false };
    }
  };

  return {
    loadNotesFromServer,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    createTask,
    updateTask,
    deleteTask,
    reorderTasks,
  };
}
