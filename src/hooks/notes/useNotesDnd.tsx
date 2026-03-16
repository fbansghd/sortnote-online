import { useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { useNotesApi } from "./useNotesApi";
import type { Memo, Task, ActiveCategory } from '@/types/notes';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';

/**
 * ドラッグ&ドロップのロジックを管理するカスタムフック
 * reorderは楽観的更新を行い、失敗時はpre-drag stateへロールバック
 */
export function useNotesDnd(memos: Memo[], setMemos: (memos: Memo[]) => void) {
  const { reorderCategories, reorderTasks, updateTask } = useNotesApi();

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeCategory, setActiveCategory] = useState<ActiveCategory | null>(null);

  /**
   * ドラッグ開始時の処理
   */
  const handleDragStart = (event: DragStartEvent): void => {
    const { active } = event;

    // タスクのドラッグ
    const task = memos
      .flatMap((cat) => cat.tasks)
      .find((task) => task.id === active.id);
    setActiveTask(task || null);

    // カテゴリーのドラッグ
    const category = memos.find((cat) => cat.id === active.id);
    if (category) {
      setActiveCategory({
        id: category.id,
        label: category.category,
        tasks: category.tasks,
      });
    } else {
      setActiveCategory(null);
    }
  };

  /**
   * ドラッグ終了時の処理
   */
  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      setActiveTask(null);
      setTimeout(() => setActiveCategory(null), 0);
      return;
    }

    // カテゴリーの並び替え（楽観的更新 + 失敗時ロールバック）
    const activeCategoryIndex = memos.findIndex((cat) => cat.id === active.id);
    const overCategoryIndex = memos.findIndex((cat) => cat.id === over.id);
    if (activeCategoryIndex !== -1 && overCategoryIndex !== -1) {
      const prevMemos = memos;
      const newMemos = arrayMove(memos, activeCategoryIndex, overCategoryIndex);
      setMemos(newMemos);

      reorderCategories(newMemos.map(c => c.id)).then(result => {
        if (!result.ok) setMemos(prevMemos);
      });

      setActiveTask(null);
      setTimeout(() => setActiveCategory(null), 0);
      return;
    }

    // タスクの並び替え
    const fromCategoryIndex = memos.findIndex((cat) =>
      cat.tasks.some((task) => task.id === active.id)
    );
    if (fromCategoryIndex === -1) {
      setActiveTask(null);
      return;
    }

    let toCategoryIndex = memos.findIndex((cat) =>
      cat.tasks.some((task) => task.id === over.id)
    );
    let overIndex = -1;

    if (toCategoryIndex !== -1) {
      overIndex = memos[toCategoryIndex].tasks.findIndex((t) => t.id === over.id);
    } else {
      toCategoryIndex = memos.findIndex((cat) => cat.id === over.id);
      overIndex = memos[toCategoryIndex]?.tasks.length ?? -1;
      if (toCategoryIndex === -1) {
        setActiveTask(null);
        return;
      }
    }

    const prevMemos = memos;

    if (fromCategoryIndex === toCategoryIndex) {
      // 同じカテゴリー内でタスクの並び替え（楽観的更新 + 失敗時ロールバック）
      const oldIndex = memos[fromCategoryIndex].tasks.findIndex((t) => t.id === active.id);
      const newIndex = overIndex;
      const newMemos = [...memos];
      const reorderedTasks = arrayMove(memos[fromCategoryIndex].tasks, oldIndex, newIndex);
      newMemos[fromCategoryIndex] = { ...newMemos[fromCategoryIndex], tasks: reorderedTasks };
      setMemos(newMemos);

      const categoryId = memos[fromCategoryIndex].id;
      reorderTasks(categoryId, reorderedTasks.map(t => t.id)).then(result => {
        if (!result.ok) setMemos(prevMemos);
      });

      setActiveTask(null);
      setTimeout(() => setActiveCategory(null), 0);
      return;
    }

    // タスクを別カテゴリーへ移動（楽観的更新 + 失敗時ロールバック）
    const task = memos[fromCategoryIndex].tasks.find((task) => task.id === active.id);
    if (!task) {
      setActiveTask(null);
      return;
    }
    const newFromTasks = memos[fromCategoryIndex].tasks.filter((t) => t.id !== active.id);
    const newToTasks = [
      ...memos[toCategoryIndex].tasks.slice(0, overIndex),
      task,
      ...memos[toCategoryIndex].tasks.slice(overIndex),
    ];

    const newMemos = memos.map((cat, idx) => {
      if (idx === fromCategoryIndex) return { ...cat, tasks: newFromTasks };
      if (idx === toCategoryIndex) return { ...cat, tasks: newToTasks };
      return cat;
    });

    setMemos(newMemos);

    const toCategoryId = memos[toCategoryIndex].id;
    updateTask(task.id as string, { categoryId: toCategoryId }).then(result => {
      if (!result.ok) {
        setMemos(prevMemos);
      } else {
        // 移動先カテゴリーの並び順も更新
        reorderTasks(toCategoryId, newToTasks.map(t => t.id));
      }
    });

    setActiveTask(null);
    setTimeout(() => setActiveCategory(null), 0);
  };

  /**
   * ドラッグキャンセル時の処理
   */
  const handleDragCancel = (): void => {
    setActiveTask(null);
    setTimeout(() => setActiveCategory(null), 0);
  };

  return {
    activeTask,
    setActiveTask,
    activeCategory,
    setActiveCategory,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  };
}
