import { useNotesData } from "./notes/useNotesData";
import { useNotesDnd } from "./notes/useNotesDnd";
import { useNotesUI } from "./notes/useNotesUI";
import { useNotesApi } from "./notes/useNotesApi";
import type { NotesState } from '@/types/notes';

/**
 * メインのカスタムフック
 * データ管理、DnD、UI状態、API通信を統合して提供
 */
export function useNotes(): NotesState {
  const data = useNotesData();
  const ui = useNotesUI(data.memos);
  const dnd = useNotesDnd(data.memos, data.setMemos);
  const api = useNotesApi();

  return {
    ...data,
    ...ui,
    ...dnd,
    ...api,
  };
}
