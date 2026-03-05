import { useState } from "react";
import { useNotesApi } from "./useNotesApi";
import type { Memo, Task } from '@/types/notes';

/**
 * データ管理とCRUD操作を担当するカスタムフック
 */
export function useNotesData() {
  const { saveNotesToServer } = useNotesApi();

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
    const newMemos = memos.map(cat =>
      cat.id === categoryId ? { ...cat, collapsed: !cat.collapsed } : cat
    );
    setMemos(newMemos);
    await saveNotesToServer(newMemos);
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

    const newMemos: Memo[] = [...memos, { id: '', category: trimmedText, tasks: [], collapsed: false }];
    setText("");
    setTaskInputs([...taskInputs, ""]);

    try {
      const result = await saveNotesToServer(newMemos);
      if (result?.memos) {
        setMemos(result.memos);
      }
    } catch (err) {
      console.error('Failed to sync category ID:', err);
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
    if (isDuplicate) {
      return;
    }

    const newTask: Task = {
      id: '',
      text: trimmed,
      done: false,
    };

    const newMemos = [...memos];
    const tasks = [...currentTasks, newTask];
    newMemos[catIdx] = {
      ...category,
      tasks: sortTasks(tasks),
    };

    const newInputs = [...taskInputs];
    newInputs[catIdx] = "";
    setTaskInputs(newInputs);

    try {
      const result = await saveNotesToServer(newMemos);
      if (result?.memos) {
        setMemos(result.memos);
      }
    } catch (err) {
      console.error('Failed to sync task ID:', err);
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

    const tasks = category.tasks.map(task =>
      task.id === taskId ? { ...task, done: !task.done } : task
    );

    const newMemos = [...memos];
    newMemos[catIdx] = { ...category, tasks: sortTasks(tasks) };

    setMemos(newMemos);
    await saveNotesToServer(newMemos);
  };

  /**
   * タスク削除（ID指定）
   */
  const deleteTaskById = async (categoryId: string, taskId: string): Promise<void> => {
    const idx = memos.findIndex((cat) => cat.id === categoryId);
    if (idx === -1) {
      console.error(`Category not found for deleteTaskById: ${categoryId}`);
      return;
    }

    const cat = memos[idx];
    if (!cat || !Array.isArray(cat.tasks)) {
      console.error(`Invalid category/tasks for deleteTaskById at index ${idx}`);
      return;
    }

    const newTasks = cat.tasks.filter((t) => t.id !== taskId);
    if (newTasks.length === cat.tasks.length) {
      console.warn(`Task not found for deleteTaskById: ${taskId}`);
      return;
    }

    const newMemos = [...memos];
    newMemos[idx] = { ...cat, tasks: newTasks };

    setMemos(newMemos);
    await saveNotesToServer(newMemos);
  };

  /**
   * カテゴリー削除
   */
  const deleteCategory = async (catIdx: number): Promise<void> => {
    const removedCategory = memos[catIdx];
    if (!removedCategory) return;

    const newMemos = memos.filter((_, i) => i !== catIdx);
    setMemos(newMemos);
    setTaskInputs((inputs) => inputs.filter((_, i) => i !== catIdx));
    await saveNotesToServer(newMemos);
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
