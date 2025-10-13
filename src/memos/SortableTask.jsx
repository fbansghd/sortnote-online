import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import styles from "./App.module.scss";

// ドラッグ＆ドロップ可能なタスクコンポーネント
function SortableTask({ id, text, done, onToggle, onDelete, isOverlay, isParentOverlay }) {
  // DnD KitのuseSortableフックでドラッグ状態や属性を取得
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    // motion.divでアニメーション付きのタスク枠を表示
    <motion.div
      ref={setNodeRef}
      layout
      initial={
        isOverlay
          ? { opacity: 1, scale: 1, y: 10 }
          : false
      }
      animate={
        isOverlay
          ? isParentOverlay 
            ? { opacity: 1, scale: 1, y: 0, boxShadow: "none", background: "#b89d19ff" } 
            : { opacity: 1, scale: 1, y: 0, boxShadow: "0 8px 24px var(--category-border), 0 0 0 2px var(--category-border)", background: "var(--task-bg)" }
          : { opacity: 1, scale: 1, y: 0, boxShadow: "none" }
      }
      exit={
        isOverlay
          ? { opacity: 0, scale: 1, y: -20 }
          : { opacity: 1, scale: 1, y: 0 }
      }
      transition={{ duration: 0.18 }}
      className={`${styles.taskItem} ${done ? styles.done : ""} ${isDragging ? styles.dragging : ""} ${isParentOverlay ? styles.isParentOverlay : ""}`}
      style={{
        minHeight: isOverlay ? 40 : 40, // タスクの高さ
        borderRadius: isOverlay ? "4px" : "4px", 
        transform: CSS.Transform.toString(transform),
        transition: transition || "transform 200ms cubic-bezier(0.2, 0, 0, 1)",
        zIndex: isOverlay ? 100 : undefined,
        pointerEvents: isOverlay ? "none" : undefined,
      }}
      {...attributes}
      // listenersはここでは付与しない（ドラッグハンドルにのみ付与）
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
    </motion.div>
  );
}

export default SortableTask;