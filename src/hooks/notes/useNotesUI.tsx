import { useState, useEffect } from "react";
import type { Memo } from '@/types/notes';

/**
 * UI状態を管理するカスタムフック
 * サイドバー、モバイル表示、入力欄の表示制御など
 */
export function useNotesUI(memos: Memo[]) {
  const [showSidebar, setShowSidebar] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth <= 600 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 600);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [mobileCategoryIndex, setMobileCategoryIndex] = useState<number>(0);
  const [showTaskInput, setShowTaskInput] = useState<Record<number, boolean>>({});

  const toggleTaskInput = (categoryIndex: number): void => {
    setShowTaskInput((prev) => ({
      ...prev,
      [categoryIndex]: !prev[categoryIndex],
    }));
  };

  const [isAltColor, setIsAltColor] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem("isAltColor");
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("isAltColor", JSON.stringify(isAltColor));
    }
  }, [isAltColor]);

  const getOpenCategoryIndexes = (): number[] =>
    memos
      .map((cat, idx) => (!cat.collapsed ? idx : null))
      .filter((idx): idx is number => idx !== null);

  const handlePrevCategory = (): void => {
    const openIndexes = getOpenCategoryIndexes();
    if (openIndexes.length === 0) return;
    const currentIdx = openIndexes.indexOf(mobileCategoryIndex);
    const prevIdx = (currentIdx - 1 + openIndexes.length) % openIndexes.length;
    setMobileCategoryIndex(openIndexes[prevIdx]);
  };

  const handleNextCategory = (): void => {
    const openIndexes = getOpenCategoryIndexes();
    if (openIndexes.length === 0) return;
    const currentIdx = openIndexes.indexOf(mobileCategoryIndex);
    const nextIdx = (currentIdx + 1) % openIndexes.length;
    setMobileCategoryIndex(openIndexes[nextIdx]);
  };

  return {
    showSidebar,
    setShowSidebar,
    isMobile,
    setIsMobile,
    mobileCategoryIndex,
    setMobileCategoryIndex,
    handlePrevCategory,
    handleNextCategory,
    showTaskInput,
    setShowTaskInput,
    toggleTaskInput,
    isAltColor,
    setIsAltColor,
  };
}
