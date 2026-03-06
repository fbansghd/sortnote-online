/**
 * APIリクエスト・レスポンスの型定義
 */

export type TaskPayload = {
  id?: string;
  text: string;
  done: boolean;
};

export type CategoryPayload = {
  id?: string;
  category: string;
  sort_index?: number;
  collapsed?: boolean;
  tasks: TaskPayload[];
};

export type MemosPayload = {
  memos: CategoryPayload[];
};
