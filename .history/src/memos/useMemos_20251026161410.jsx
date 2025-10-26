import { useState, useEffect, useRef } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { useSession } from 'next-auth/react';
import React from 'react'; // ← React is not defined の対策（追加）
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// 追加: タイトル正規化
const normalizeTitle = (s) => (s || '').trim().toLowerCase();

export function useMemos() {
  // カテゴリー追加用テキスト
  const [text, setText] = useState("");
  // 各カテゴリーごとのタスク入力欄の値
  const [taskInputs, setTaskInputs] = useState([]);
  // 全カテゴリーとタスクのデータ（localStorageを使わず空で開始）
  const [memos, setMemos] = useState([]);

  // ドラッグ中のタスク情報
  const [activeTask, setActiveTask] = useState(null);
  // ドラッグ中のカテゴリー情報
  const [activeCategory, setActiveCategory] = useState(null);

  // サイドバー表示状態
  const [showSidebar, setShowSidebar] = useState(false);

  // モバイル判定（画面幅600px以下）
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 600);
  useEffect(() => {
    // 画面サイズ変更時にモバイル判定を更新
    const handleResize = () => setIsMobile(window.innerWidth <= 600);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // モバイル用：表示中カテゴリーのインデックス
  const [mobileCategoryIndex, setMobileCategoryIndex] = useState(0);

  // 折り畳み中カテゴリーIDリスト → タイトルキーで保持
  const [collapsedCategories, setCollapsedCategories] = useState(() => {
    const saved = localStorage.getItem("collapsedCategories");
    return saved ? JSON.parse(saved) : [];
  });

  // 折り畳み状態をローカル保存
  useEffect(() => {
    localStorage.setItem("collapsedCategories", JSON.stringify(collapsedCategories));
  }, [collapsedCategories]);

  // カテゴリーの折り畳み/展開切り替え（idではなくタイトルで）
  const toggleCategoryCollapse = (categoryKey) => {
    const key = normalizeTitle(categoryKey);
    setCollapsedCategories(prev =>
      prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  // 折り畳まれていないカテゴリーのインデックス一覧取得（タイトルで照合）
  const getOpenCategoryIndexes = () =>
    memos
      .map((cat, idx) => (!collapsedCategories.includes(normalizeTitle(cat.category)) ? idx : null))
      .filter(idx => idx !== null);

  // モバイル用：前のカテゴリーへ切り替え
  const handlePrevCategory = () => {
    const openIndexes = getOpenCategoryIndexes();
    if (openIndexes.length === 0) return;
    const currentIdx = openIndexes.indexOf(mobileCategoryIndex);
    const prevIdx = (currentIdx - 1 + openIndexes.length) % openIndexes.length;
    setMobileCategoryIndex(openIndexes[prevIdx]);
  };

  // モバイル用：次のカテゴリーへ切り替え
  const handleNextCategory = () => {
    const openIndexes = getOpenCategoryIndexes();
    if (openIndexes.length === 0) return;
    const currentIdx = openIndexes.indexOf(mobileCategoryIndex);
    const nextIdx = (currentIdx + 1) % openIndexes.length;
    setMobileCategoryIndex(openIndexes[nextIdx]);
  };

  // カテゴリー追加
  const addCategory = () => {
    if (!text) return;
    const trimmedText = text.trim();
    const normalized = normalizeTitle(trimmedText);
    const isDuplicate = memos.some(memo => normalizeTitle(memo.category) === normalized);
    if (isDuplicate) {
      alert('同じ名前のカテゴリーが既に存在します');
      return;
    }
    setMemos([...memos, { id: uuidv4(), category: trimmedText, tasks: [] }]);
    setText("");
    setTaskInputs([...taskInputs, ""]);
  };

  // タスク配列を未完了→完了順にソート
  const sortTasks = (tasks) => {
    return tasks.slice().sort((a, b) => a.done - b.done);
  };

  // タスク追加
  // タスク追加の安全性強化
  const addTaskToCategory = (catIdx, task) => {
    const trimmed = (task || '').toString().trim();
    if (!trimmed) return;

    console.log(`Adding task "${trimmed}" to category index ${catIdx}`); // デバッグログ

    setMemos((prev) => {
      try {
        // インデックス範囲チェック
        if (catIdx < 0 || catIdx >= prev.length) {
          console.error(`Invalid category index: ${catIdx}, array length: ${prev.length}`);
          return prev;
        }

        const newMemos = [...prev];
        const category = newMemos[catIdx];
        
        if (!category) {
          console.error(`Category at index ${catIdx} is undefined`);
          return prev;
        }

        const currentTasks = category.tasks || [];
        
        // 重複チェック
        const isDuplicate = currentTasks.some(existingTask => 
          existingTask.text === trimmed
        );
        if (isDuplicate) {
          console.log('Duplicate task prevented:', trimmed);
          return prev;
        }

        const newTask = { 
          id: uuidv4(), 
          text: trimmed, 
          done: false,
          createdAt: new Date().toISOString()
        };
        
        const tasks = [...currentTasks, newTask];
        newMemos[catIdx] = { 
          ...category, 
          tasks: sortTasks(tasks),
          updatedAt: new Date().toISOString()
        };
        
        console.log(`Task added successfully to "${category.category}"`); // デバッグログ
        return newMemos;
      } catch (error) {
        console.error('Error adding task:', error);
        return prev;
      }
    });

    // 入力欄クリア
    const newInputs = [...taskInputs];
    newInputs[catIdx] = "";
    setTaskInputs(newInputs);
  };

  // タスク完了状態の切り替え
  // タスク操作の安全性強化
  const toogleTaskDone = (catIdx, taskId) => {
    setMemos((prev) => {
      try {
        if (catIdx < 0 || catIdx >= prev.length) {
          console.error(`Invalid category index: ${catIdx}`);
          return prev;
        }

        const newMemos = [...prev];
        const category = newMemos[catIdx];
        
        if (!category || !category.tasks) {
          console.error(`Invalid category or tasks at index ${catIdx}`);
          return prev;
        }

        const tasks = category.tasks.map(task =>
          task.id === taskId ? { ...task, done: !task.done } : task
        );
        
        newMemos[catIdx] = { ...category, tasks: sortTasks(tasks) };
        return newMemos;
      } catch (error) {
        console.error('Error toggling task:', error);
        return prev;
      }
    });
  };
  // Task delete by IDs (safer than index-based)
  const deleteTaskById = (categoryId, taskId) => {
    setMemos((prev) => {
      try {
        const idx = prev.findIndex((cat) => cat.id === categoryId);
        if (idx === -1) {
          console.error(`Category not found for deleteTaskById: ${categoryId}`);
          return prev;
        }
        const next = [...prev];
        const cat = next[idx];
        if (!cat || !Array.isArray(cat.tasks)) {
          console.error(`Invalid category/tasks for deleteTaskById at index ${idx}`);
          return prev;
        }
        const beforeLen = cat.tasks.length;
        const newTasks = cat.tasks.filter((t) => t.id !== taskId);
        if (newTasks.length === beforeLen) {
          console.warn(`Task not found for deleteTaskById: ${taskId}`);
          return prev;
        }
        next[idx] = { ...cat, tasks: newTasks };
        return next;
      } catch (e) {
        console.error('deleteTaskById failed:', e);
        return prev;
      }
    });
  };

  // カテゴリー削除（そのカテゴリーのtasksも同時に削除）
  const deleteCategory = (catIdx) => {
    setMemos((memos) => {
      // 削除するカテゴリーIDを取得
      const removedCategory = memos[catIdx];
      if (!removedCategory) return memos;
      const removedCategoryId = removedCategory.id;
      // カテゴリーとそのtasksを削除
      return memos.filter((cat, i) => i !== catIdx);
    });
    setTaskInputs((inputs) => inputs.filter((_, i) => i !== catIdx));
    saveMemosToServer();
  };

  // DnD Kit: ドラッグ開始時の処理
  const handleDragStart = (event) => {
    const { active } = event;
    // タスクのドラッグ
    const task = memos
      .flatMap((cat) => cat.tasks)
      .find((task) => task.id === active.id);
    setActiveTask(task);

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

  // DnD Kit: ドラッグ終了時の処理
  const handleDragEnd = (event) => {
    const { active, over } = event;
    // ドラッグ先がない or 同じ場所ならリセット
    if (!over || active.id === over.id) {
      setActiveTask(null);
      // 非同期でactiveCategoryをリセット（連続ドラッグ対策）
      setTimeout(() => setActiveCategory(null), 0);
      return;
    }

    // カテゴリーの並び替え
    const activeCategoryIndex = memos.findIndex((cat) => cat.id === active.id);
    const overCategoryIndex = memos.findIndex((cat) => cat.id === over.id);
    if (activeCategoryIndex !== -1 && overCategoryIndex !== -1) {
      const newMemos = arrayMove(memos, activeCategoryIndex, overCategoryIndex);
      setMemos(newMemos);
      setActiveTask(null);
      setTimeout(() => setActiveCategory(null), 0); // ← 非同期リセット
      return;
    }

    // タスクの並び替え（同じカテゴリー内）
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
      // タスクをカテゴリーの末尾に移動
      toCategoryIndex = memos.findIndex((cat) => cat.id === over.id);
      overIndex = memos[toCategoryIndex]?.tasks.length ?? -1;
      if (toCategoryIndex === -1) {
        setActiveTask(null);
        return;
      }
    }

    if (fromCategoryIndex === toCategoryIndex) {
      // 同じカテゴリー内でタスクの並び替え
      const oldIndex = memos[fromCategoryIndex].tasks.findIndex((t) => t.id === active.id);
      const newIndex = overIndex;
      const newMemos = [...memos];
      newMemos[fromCategoryIndex] = {
        ...newMemos[fromCategoryIndex],
        tasks: arrayMove(memos[fromCategoryIndex].tasks, oldIndex, newIndex),
      };
      setMemos(newMemos);
      setActiveTask(null);
      setTimeout(() => setActiveCategory(null), 0); // ← 非同期リセット
      return;
    }

    // タスクを別カテゴリーへ移動
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
      if (idx === fromCategoryIndex) {
        return { ...cat, tasks: newFromTasks };
      }
      if (idx === toCategoryIndex) {
        return { ...cat, tasks: newToTasks };
      }
      return cat;
    });

    setMemos(newMemos);
    setActiveTask(null);
    setTimeout(() => setActiveCategory(null), 0); // ← 非同期リセット
  };

  // DnD Kit: ドラッグキャンセル時の処理
  const handleDragCancel = () => {
    setActiveTask(null);
    setTimeout(() => setActiveCategory(null), 0); // ← 非同期リセット
  };

  // 各カテゴリーごとのタスク入力欄表示状態
  const [showTaskInput, setShowTaskInput] = useState({});
  // タスク入力欄の表示/非表示切り替え
  const toggleTaskInput = (categoryIndex) => {
    setShowTaskInput((prev) => ({
      ...prev,
      [categoryIndex]: !prev[categoryIndex],
    }));
  };

  // テーマカラー切り替え状態（ローカル保存付き）
  const [isAltColor, setIsAltColor] = useState(() => {
    const saved = localStorage.getItem("isAltColor");
    return saved ? JSON.parse(saved) : false;
  });
  useEffect(() => {
    localStorage.setItem("isAltColor", JSON.stringify(isAltColor));
  }, [isAltColor]);

  

  // Server sync helpers (POST/GET to /api/notes)
  // saveMemosToServer: idも送る
  const saveMemosToServer = async () => {
    try {
      const cleaned = (Array.isArray(memos) ? memos : []).map((c, i) => ({
        id: c.id, // ← 追加
        category: c.category,
        sort_index: i,
        tasks: (Array.isArray(c.tasks) ? c.tasks : []).map(t => ({
          id: t.id, // ← 追加
          text: t.text ?? '',
          done: !!t.done,
        })),
      }));

      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memos: cleaned }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Save failed');
      return { ok: true };
    } catch (err) {
      console.error('Save failed:', err);
      return { ok: false, error: String(err) };
    }
  };

  // サーバーからロードしたデータをそのままセット
  const loadMemosFromServer = async () => {
    try {
      const res = await fetch('/api/notes');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Load failed');

      const serverMemos = data?.memos;
      if (Array.isArray(serverMemos)) {
        setMemos(serverMemos); // ←ID付きでそのままセット
        localStorage.setItem('memos', JSON.stringify(serverMemos));
      }

      if (Array.isArray(data?.collapsedTitles)) {
        setCollapsedCategories(data.collapsedTitles); // サーバー状態を採用
        localStorage.setItem('collapsedCategories', JSON.stringify(data.collapsedTitles));
      }

      return { ok: true, memos: serverMemos };
    } catch (err) {
      console.error('Load failed:', err);
      return { ok: false, error: String(err) };
    }
  };

  // すべての状態・関数を返す
  return {
    text,
    setText,
    taskInputs,
    setTaskInputs,
    memos,
    setMemos,
    addCategory,
    addTaskToCategory,
    toogleTaskDone,
    deleteTaskById,
    deleteCategory,
    showTaskInput,
    setShowTaskInput,
    toggleTaskInput,
    isAltColor,
    setIsAltColor,
    activeTask,
    setActiveTask,
    activeCategory,
    setActiveCategory,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    collapsedCategories,
    setCollapsedCategories,
    toggleCategoryCollapse,
    showSidebar,
    setShowSidebar,
    isMobile,
    setIsMobile,
    mobileCategoryIndex,
    setMobileCategoryIndex,
    handlePrevCategory,
    handleNextCategory,
    saveMemosToServer,
    loadMemosFromServer,
  };
}

// Note: side effects (auto-load and auto-save) cannot be triggered inside the hook return,
// so we create a wrapper hook that uses the session and memos state to trigger save/load.
export function useMemosSync(memos, setMemos) {
  const { status } = useSession();
  const didInitialLoad = React.useRef(false);
  const lastServerHash = React.useRef(null);

  const hash = React.useCallback((v) => {
    try { return JSON.stringify(v); } catch { return String(Math.random()); }
  }, []);

  // 初回ロード：サーバー優先（localStorage不使用）
  React.useEffect(() => {
    if (status !== 'authenticated' || didInitialLoad.current) return;
    didInitialLoad.current = true;
    (async () => {
      try {
        const res = await fetch('/api/notes', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const serverMemos = Array.isArray(data?.memos) ? data.memos : null;
        if (serverMemos) {
          setMemos(serverMemos);
          // 送信用ハッシュはクリーンペイロードで管理
          const cleaned = serverMemos.map((c, i) => ({
            category: c.category,
            sort_index: i,
            tasks: (Array.isArray(c.tasks) ? c.tasks : []).map(t => ({
              text: t.text ?? '',
              done: !!t.done,
            })),
          }));
          lastServerHash.current = JSON.stringify({ memos: cleaned });
        }
      } catch (e) {
        console.error('[sync] initial load failed:', e);
      }
    })();
  }, [status, setMemos]);

  // 自動保存：空でも送る
  React.useEffect(() => {
    if (status !== 'authenticated') return;
    if (!Array.isArray(memos)) return;

    const cleaned = memos.map((c, i) => ({
      category: c.category,
      sort_index: i,
      tasks: (Array.isArray(c.tasks) ? c.tasks : []).map(t => ({
        text: t.text ?? '',
        done: !!t.done,
      })),
    }));

    // ↓この行を削除
    // if (cleaned.length === 0) return;

    const outgoing = { memos: cleaned };
    const outgoingHash = JSON.stringify(outgoing);
    if (outgoingHash === lastServerHash.current) return;

    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(outgoing),
        });
        const data = await res.json().catch(() => null);
        if (res.ok) {
          lastServerHash.current = outgoingHash;
        } else {
          console.error('[sync] save failed:', res.status, data);
        }
      } catch (e) {
        console.error('[sync] save error:', e);
      }
    }, 1200);

    return () => clearTimeout(t);
  }, [status, memos]);
}
