import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { arrayMove } from "@dnd-kit/sortable";
import { useSession } from 'next-auth/react';
import React from 'react';
import { createClient } from '@supabase/supabase-js';

const normalizeTitle = (s) => (s || '').trim().toLowerCase();

export function useMemos() {
  const [text, setText] = useState("");
  const [taskInputs, setTaskInputs] = useState([]);
  const [memos, setMemos] = useState([]);
  const [activeTask, setActiveTask] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 600);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 600);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const [mobileCategoryIndex, setMobileCategoryIndex] = useState(0);

  // ローカルストレージを使わず空配列で開始
  const [collapsedCategories, setCollapsedCategories] = useState([]);

  // ローカルストレージへの保存・復元を削除
  // useEffect(() => {
  //   localStorage.setItem("collapsedCategories", JSON.stringify(collapsedCategories));
  // }, [collapsedCategories]);

  const toggleCategoryCollapse = (categoryKey) => {
    const key = normalizeTitle(categoryKey);
    setCollapsedCategories(prev =>
      prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  const getOpenCategoryIndexes = () =>
    memos
      .map((cat, idx) => (!collapsedCategories.includes(normalizeTitle(cat.category)) ? idx : null))
      .filter(idx => idx !== null);

  const handlePrevCategory = () => {
    const openIndexes = getOpenCategoryIndexes();
    if (openIndexes.length === 0) return;
    const currentIdx = openIndexes.indexOf(mobileCategoryIndex);
    const prevIdx = (currentIdx - 1 + openIndexes.length) % openIndexes.length;
    setMobileCategoryIndex(openIndexes[prevIdx]);
  };

  const handleNextCategory = () => {
    const openIndexes = getOpenCategoryIndexes();
    if (openIndexes.length === 0) return;
    const currentIdx = openIndexes.indexOf(mobileCategoryIndex);
    const nextIdx = (currentIdx + 1) % openIndexes.length;
    setMobileCategoryIndex(openIndexes[nextIdx]);
  };

  const addCategory = () => {
    if (!text) return;
    const trimmedText = text.trim();
    const isDuplicate = memos.some(memo => memo.category === trimmedText);
    if (isDuplicate) {
      alert('同じ名前のカテゴリーが既に存在します');
      return;
    }
    setMemos([...memos, { id: uuidv4(), category: trimmedText, tasks: [] }]);
    setText("");
    setTaskInputs([...taskInputs, ""]);
  };

  const sortTasks = (tasks) => {
    return tasks.slice().sort((a, b) => a.done - b.done);
  };

  const addTaskToCategory = (catIdx, task) => {
    const trimmed = (task || '').toString().trim();
    if (!trimmed) return;
    setMemos((prev) => {
      try {
        if (catIdx < 0 || catIdx >= prev.length) return prev;
        const newMemos = [...prev];
        const category = newMemos[catIdx];
        if (!category) return prev;
        const currentTasks = category.tasks || [];
        const isDuplicate = currentTasks.some(existingTask => existingTask.text === trimmed);
        if (isDuplicate) return prev;
        const newTask = { id: uuidv4(), text: trimmed, done: false, createdAt: new Date().toISOString() };
        const tasks = [...currentTasks, newTask];
        newMemos[catIdx] = { ...category, tasks: sortTasks(tasks), updatedAt: new Date().toISOString() };
        return newMemos;
      } catch (error) {
        return prev;
      }
    });
    const newInputs = [...taskInputs];
    newInputs[catIdx] = "";
    setTaskInputs(newInputs);
  };

  const toogleTaskDone = (catIdx, taskId) => {
    setMemos((prev) => {
      try {
        if (catIdx < 0 || catIdx >= prev.length) return prev;
        const newMemos = [...prev];
        const category = newMemos[catIdx];
        if (!category || !category.tasks) return prev;
        const tasks = category.tasks.map(task =>
          task.id === taskId ? { ...task, done: !task.done } : task
        );
        newMemos[catIdx] = { ...category, tasks: sortTasks(tasks) };
        return newMemos;
      } catch (error) {
        return prev;
      }
    });
  };

  const deleteTaskById = (categoryId, taskId) => {
    setMemos((prev) => {
      try {
        const idx = prev.findIndex((cat) => cat.id === categoryId);
        if (idx === -1) return prev;
        const next = [...prev];
        const cat = next[idx];
        if (!cat || !Array.isArray(cat.tasks)) return prev;
        const beforeLen = cat.tasks.length;
        const newTasks = cat.tasks.filter((t) => t.id !== taskId);
        if (newTasks.length === beforeLen) return prev;
        next[idx] = { ...cat, tasks: newTasks };
        return next;
      } catch (e) {
        return prev;
      }
    });
  };

  const deleteCategory = (catIdx) => {
    setMemos((memos) => {
      const removedCategory = memos[catIdx];
      if (!removedCategory) return memos;
      return memos.filter((cat, i) => i !== catIdx);
    });
    setTaskInputs((inputs) => inputs.filter((_, i) => i !== catIdx));
    saveMemosToServer();
  };

  const handleDragStart = (event) => {
    const { active } = event;
    const task = memos
      .flatMap((cat) => cat.tasks)
      .find((task) => task.id === active.id);
    setActiveTask(task);
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

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      setActiveTask(null);
      setTimeout(() => setActiveCategory(null), 0);
      return;
    }
    const activeCategoryIndex = memos.findIndex((cat) => cat.id === active.id);
    const overCategoryIndex = memos.findIndex((cat) => cat.id === over.id);
    if (activeCategoryIndex !== -1 && overCategoryIndex !== -1) {
      const newMemos = arrayMove(memos, activeCategoryIndex, overCategoryIndex);
      setMemos(newMemos);
      setActiveTask(null);
      setTimeout(() => setActiveCategory(null), 0);
      return;
    }
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
    if (fromCategoryIndex === toCategoryIndex) {
      const oldIndex = memos[fromCategoryIndex].tasks.findIndex((t) => t.id === active.id);
      const newIndex = overIndex;
      const newMemos = [...memos];
      newMemos[fromCategoryIndex] = {
        ...newMemos[fromCategoryIndex],
        tasks: arrayMove(memos[fromCategoryIndex].tasks, oldIndex, newIndex),
      };
      setMemos(newMemos);
      setActiveTask(null);
      setTimeout(() => setActiveCategory(null), 0);
      return;
    }
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
    setTimeout(() => setActiveCategory(null), 0);
  };

  const handleDragCancel = () => {
    setActiveTask(null);
    setTimeout(() => setActiveCategory(null), 0);
  };

  const [showTaskInput, setShowTaskInput] = useState({});
  const toggleTaskInput = (categoryIndex) => {
    setShowTaskInput((prev) => ({
      ...prev,
      [categoryIndex]: !prev[categoryIndex],
    }));
  };

  // テーマカラー切り替え状態（ローカル保存付き→ローカルストレージ削除）
  const [isAltColor, setIsAltColor] = useState(false);

  // Server sync helpers (POST/GET to /api/notes)
  const saveMemosToServer = async () => {
    try {
      const cleaned = memos.map((c, i) => ({
        id: c.id,
        category: c.category,
        sort_index: i,
        tasks: (Array.isArray(c.tasks) ? c.tasks : []).map(t => ({
          id: t.id,
          text: t.text ?? '',
          done: !!t.done,
        })),
      }));

      if (cleaned.length === 0) return { ok: true, skipped: true };

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

  const loadMemosFromServer = async () => {
    try {
      const res = await fetch('/api/notes');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Load failed');

      const serverMemos = data?.memos;
      if (Array.isArray(serverMemos)) {
        setMemos(serverMemos);
        // localStorage.setItem('memos', JSON.stringify(serverMemos)); // ←削除
      }

      if (Array.isArray(data?.collapsedTitles)) {
        setCollapsedCategories(data.collapsedTitles);
        // localStorage.setItem('collapsedCategories', JSON.stringify(data.collapsedTitles)); // ←削除
      }

      return { ok: true, memos: serverMemos };
    } catch (err) {
      console.error('Load failed:', err);
      return { ok: false, error: String(err) };
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
          const cleaned = serverMemos.map((c, i) => ({
            id: c.id,
            category: c.category,
            sort_index: i,
            tasks: (Array.isArray(c.tasks) ? c.tasks : []).map(t => ({
              id: t.id,
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
      id: c.id,
      category: c.category,
      sort_index: i,
      tasks: (Array.isArray(c.tasks) ? c.tasks : []).map(t => ({
        id: t.id,
        text: t.text ?? '',
        done: !!t.done,
      })),
    }));

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
    }, 500); // ← 0.5秒ごとにPOST

    return () => clearTimeout(t);
  }, [status, memos]);
}
