import styles from "@/styles/App.module.scss";
import type { Memo } from '@/types/notes';

interface NotesSidebarProps {
  text: string;
  setText: (value: string) => void;
  memos: Memo[];
  addCategory: () => Promise<void>;
  toggleCategoryCollapse: (categoryId: string) => Promise<void>;
}

/**
 * サイドバーコンポーネント
 * カテゴリー追加と折り畳み中カテゴリー一覧を表示
 */
export function NotesSidebar({
  text,
  setText,
  memos,
  addCategory,
  toggleCategoryCollapse
}: NotesSidebarProps) {
  return (
    <div className={styles.sidebar}>
      <div className={styles.categoryInputStyle}>
        <input
          className={styles.categoryInput}
          placeholder=" input category here"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              addCategory();
            }
          }}
        />
        <button
          className={styles.categoryAddBtn}
          onClick={addCategory}
        >
          add
        </button>
      </div>
      {/* 折り畳み中カテゴリーの一覧表示 */}
      {memos
        .filter(cat => cat.collapsed)
        .map(cat => (
          <div
            key={cat.id}
            className={styles.sidebarCategory}
            onClick={() => toggleCategoryCollapse(cat.id)}
          >
            {cat.category}
          </div>
        ))}
    </div>
  );
}
