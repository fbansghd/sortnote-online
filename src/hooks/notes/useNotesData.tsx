import { useState } from "react";
import { useNotesApi } from "./useNotesApi";
import type { Memo, Task } from '@/types/notes';

/**
 * データ管理とCRUD操作を担当するカスタムフック
 * 全操作は「API → DBレスポンス → state更新」の順で行う
 */
export function useNotesData() {
  const {
    createCategory,
    updateCategory,
    deleteCategory: apiDeleteCategory,
    createTask,
    updateTask,
    deleteTask: apiDeleteTask,
  } = useNotesApi();

  const [text, setText] = useState<string>("");
  const [taskInputs, setTaskInputs] = useState<string[]>([]);
  const [memos, setMemos] = useState<Memo[]>([]);

  /**
   * タスク配列を未完了→完了順にソート
   */
  const sortTasks = (tasks: Task[]): Task[] => {
    return tasks.slice().sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0));
  };

  /**
   * カテゴリーの折り畳み/展開切り替え
   */
  const toggleCategoryCollapse = async (categoryId: string): Promise<void> => {
    const target = memos.find(cat => cat.id === categoryId);
    if (!target) return;

    const result = await updateCategory(categoryId, { collapsed: !target.collapsed });
    if (result.ok && result.data) {
      setMemos(prev => prev.map(cat =>
        cat.id === categoryId ? { ...result.data!, tasks: cat.tasks } : cat
      ));
    }
  };

  /**
   * カテゴリー追加
   */
  const addCategory = async (): Promise<void> => {
    if (!text) return;

    const trimmedText = text.trim();
    const isDuplicate = memos.some(memo => memo.category === trimmedText);
    if (isDuplicate) {
      alert('同じ名前のカテゴリーが既に存在します');
      return;
    }

    setText("");
    const result = await createCategory(trimmedText);
    if (result.ok && result.data) {
      setMemos(prev => [...prev, result.data!]);
      setTaskInputs(prev => [...prev, ""]);
    }
  };

  /**
   * タスク追加
   */
  const addTaskToCategory = async (catIdx: number, task: string): Promise<void> => {
    const trimmed = (task || '').toString().trim();
    if (!trimmed) return;

    if (catIdx < 0 || catIdx >= memos.length) {
      console.error(`Invalid category index: ${catIdx}, array length: ${memos.length}`);
      return;
    }

    const category = memos[catIdx];
    if (!category) {
      console.error(`Category at index ${catIdx} is undefined`);
      return;
    }

    const currentTasks = category.tasks || [];
    const isDuplicate = currentTasks.some(existingTask => existingTask.text === trimmed);
    if (isDuplicate) return;

    const newInputs = [...taskInputs];
    newInputs[catIdx] = "";
    setTaskInputs(newInputs);

    const result = await createTask(category.id, trimmed);
    if (result.ok && result.data) {
      setMemos(prev => prev.map((cat, idx) => {
        if (idx !== catIdx) return cat;
        return { ...cat, tasks: sortTasks([...cat.tasks, result.data!]) };
      }));
    }
  };

  /**
   * タスク完了状態の切り替え
   */
  const toggleTaskDone = async (catIdx: number, taskId: string): Promise<void> => {
    if (catIdx < 0 || catIdx >= memos.length) {
      console.error(`Invalid category index: ${catIdx}`);
      return;
    }

    const category = memos[catIdx];
    if (!category || !category.tasks) {
      console.error(`Invalid category or tasks at index ${catIdx}`);
      return;
    }

    const task = category.tasks.find(t => t.id === taskId);
    if (!task) return;

    const result = await updateTask(taskId, { done: !task.done });
    if (result.ok && result.data) {
      setMemos(prev => prev.map((cat, idx) => {
        if (idx !== catIdx) return cat;
        const updatedTasks = cat.tasks.map(t => t.id === taskId ? result.data! : t);
        return { ...cat, tasks: sortTasks(updatedTasks) };
      }));
    }
  };

  /**
   * タスク削除（ID指定）
   */
  const deleteTaskById = async (categoryId: string, taskId: string): Promise<void> => {
    const result = await apiDeleteTask(taskId);
    if (result.ok) {
      setMemos(prev => prev.map(cat => {
        if (cat.id !== categoryId) return cat;
        return { ...cat, tasks: cat.tasks.filter(t => t.id !== taskId) };
      }));
    }
  };

  /**
   * カテゴリー削除
   */
  const deleteCategory = async (catIdx: number): Promise<void> => {
    const target = memos[catIdx];
    if (!target) return;

    const result = await apiDeleteCategory(target.id);
    if (result.ok) {
      setMemos(prev => prev.filter((_, i) => i !== catIdx));
      setTaskInputs(prev => prev.filter((_, i) => i !== catIdx));
    }
  };

  return {
    text,
    setText,
    taskInputs,
    setTaskInputs,
    memos,
    setMemos,
    addCategory,
    addTaskToCategory,
    toggleTaskDone,
    deleteTaskById,
    deleteCategory,
    toggleCategoryCollapse,
  };
}
