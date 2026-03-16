/**
 * APIリクエスト・レスポンスの型定義
 */

// --- 旧型（GET /api/data 用に残す） ---
export type TaskPayload = {
  id: string;
  text: string;
  done: boolean;
};

export type CategoryPayload = {
  id: string;
  category: string;
  sort_index?: number;
  collapsed?: boolean;
  tasks: TaskPayload[];
};

export type MemosPayload = {
  memos: CategoryPayload[];
};

// --- カテゴリー操作 ---
export type CreateCategoryRequest = { title: string };
export type UpdateCategoryRequest = { title?: string; collapsed?: boolean };
export type ReorderCategoriesRequest = { ids: string[] };

// --- タスク操作 ---
export type CreateTaskRequest = { categoryId: string; text: string };
export type UpdateTaskRequest = { text?: string; done?: boolean; categoryId?: string };
export type ReorderTasksRequest = { categoryId: string; ids: string[] };
