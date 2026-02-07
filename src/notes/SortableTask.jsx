import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import styles from "./App.module.scss";

// ドラッグ＆ドロップ可能なタスクコンポーネント
function SortableTask({ id, text, done, onToggle, onDelete, isOverlay, isParentOverlay }) {
  // DnD KitのuseSortableフックでドラッグ状態や属性を取得
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`${styles.taskItem} ${done ? styles.done : ""} ${isDragging ? styles.dragging : ""} ${isParentOverlay ? styles.isParentOverlay : ""}`}
      style={{
        minHeight: 40,
        borderRadius: "4px",
        transform: CSS.Transform.toString(transform),
        transition: transition || "transform 200ms cubic-bezier(0.2, 0, 0, 1)",
        zIndex: isOverlay ? 100 : undefined,
        pointerEvents: isOverlay ? "none" : undefined,
        boxShadow: isOverlay && !isParentOverlay
          ? "0 8px 24px var(--category-border), 0 0 0 2px var(--category-border)"
          : undefined,
        background: isOverlay
          ? isParentOverlay ? "#b89d19ff" : "var(--task-bg)"
          : undefined,
      }}
      {...attributes}
    >
      {/* タスクテキスト（ドラッグハンドル） */}
      <span
        className={`${done ? styles.done : ""} ${styles.grab} ${styles.taskText}`}
        // ドラッグハンドルとしてlistenersをここに付与
        {...(!isOverlay && listeners)}
        style={{ cursor: !isOverlay ? "grab" : "default", userSelect: "none" }}
      >
        {text}
      </span>
      {/* オーバーレイ表示時はアイコン非表示 */}
      {!isOverlay && (
        <span className={styles.taskIcons}>
          {/* タスク完了切り替えアイコン */}
          <span
            className={styles.doneIcon}
            onClick={onToggle}
            tabIndex={0}
            role="button"
            aria-label="タスク完了切替"
          >
            ✓
          </span>
          {/* タスク削除アイコン */}
          <span
            className={styles.deleteIcon}
            onClick={() => onDelete(id)}
            tabIndex={0}
            role="button"
            aria-label="タスク削除"
          >
            ×
          </span>
        </span>
      )}
    </div>
  );
}

export default SortableTask;