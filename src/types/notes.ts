import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';

/**
 * Notes関連の型定義
 */

export interface Task {
  id: string;
  text: string;
  done: boolean;
  created_at?: string;
}

export interface Memo {
  id: string;
  category: string;
  sort_index?: number;
  collapsed: boolean;
  tasks: Task[];
}

export interface NotesState {
  text: string;
  setText: (value: string) => void;
  taskInputs: string[];
  setTaskInputs: (value: string[]) => void;
  memos: Memo[];
  setMemos: (value: Memo[]) => void;
  addCategory: () => Promise<void>;
  addTaskToCategory: (catIdx: number, task: string) => Promise<void>;
  toggleTaskDone: (catIdx: number, taskId: string) => Promise<void>;
  deleteTaskById: (categoryId: string, taskId: string) => Promise<void>;
  deleteCategory: (catIdx: number) => Promise<void>;
  toggleCategoryCollapse: (categoryId: string) => Promise<void>;
  showTaskInput: Record<number, boolean>;
  setShowTaskInput: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  toggleTaskInput: (categoryIndex: number) => void;
  isAltColor: boolean;
  setIsAltColor: React.Dispatch<React.SetStateAction<boolean>>;
  activeTask: Task | null;
  setActiveTask: (task: Task | null) => void;
  activeCategory: ActiveCategory | null;
  setActiveCategory: (category: ActiveCategory | null) => void;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  handleDragCancel: () => void;
  showSidebar: boolean;
  setShowSidebar: React.Dispatch<React.SetStateAction<boolean>>;
  isMobile: boolean;
  setIsMobile: React.Dispatch<React.SetStateAction<boolean>>;
  mobileCategoryIndex: number;
  setMobileCategoryIndex: React.Dispatch<React.SetStateAction<number>>;
  handlePrevCategory: () => void;
  handleNextCategory: () => void;
  saveNotesToServer: (dataToSave: Memo[]) => Promise<SaveResult>;
  loadNotesFromServer: () => Promise<LoadResult>;
}

export interface ActiveCategory {
  id: string;
  label: string;
  tasks?: Task[];
}

export interface SaveResult {
  ok: boolean;
  memos?: Memo[];
  error?: string;
}

export interface LoadResult {
  ok: boolean;
  memos?: Memo[];
  error?: string;
}

export interface NotesSyncState {
  isLoading: boolean;
  isReady: boolean;
}
