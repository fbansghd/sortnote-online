import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import styles from "./App.module.scss";

// ドラッグ＆ドロップ可能なカテゴリーコンポーネント
function SortableCategory({ id, label, children, isOverlay, transform: overlayTransform, onDelete, onCollapse }) {
  // DnD KitのuseSortableフックでドラッグ状態や属性を取得
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  // オーバーレイ表示時はoverlayTransformを使う
  const appliedTransform = isOverlay ? overlayTransform : transform;

  return (
    // motion.divでアニメーション付きのカテゴリー枠を表示
    <motion.div
      ref={setNodeRef}
      layout
      initial={isOverlay ? { opacity: 1, scale: 1, y: 10 } : false}
      animate={
        isOverlay
          ? {
              opacity: 1,
              scale: 1.0,
              y: 0,
              boxShadow: "0 8px 24px #3282B888, 0 0 0 2px #3282B8",
              background: "var(--category-bg)",
            }
          : {
              opacity: 1,
              scale: 1,
              y: 0,
              boxShadow: "none",
              background: "var(--main-bg)",
            }
      }
      exit={isOverlay ? { opacity: 0, scale: 1, y: -20 } : { opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.03 }}
      className={styles.sortableCategory}
      style={{
        // ドラッグ中やオーバーレイ時はtransformを適用
        transform: appliedTransform ? CSS.Transform.toString(appliedTransform) : undefined,
        transition: transition || "transform 0.03s cubic-bezier(0.2, 0, 0, 1)",
        marginBottom: "16px",
        zIndex: isDragging || isOverlay ? 10 : "auto",
        minHeight: 100,
        pointerEvents: isOverlay ? "none" : undefined,
        borderRadius: isOverlay ? "18px" : "18px",
        border: isOverlay
          ? "3px solid var(--category-border-overlay)"
          : "3px solid var(--category-border)",
      }}
      {...attributes}
    >
      {/* カテゴリーのハンドル（ドラッグ領域＋操作ボタン） */}
      <div
        className={styles.categoryHandle}
        style={{
          cursor: "grab",
          userSelect: "none",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "relative", // ドラッグ領域とボタンのz-index調整用
        }}
      >
        {/* ドラッグ領域（ラベル部分） */}
        <span
          {...listeners}
          {...attributes}
          style={{
            flex: 1,
            minWidth: 0,
            paddingRight: "2.5em",
            cursor: "grab",
            display: "block",
            zIndex: 2, // ドラッグ領域を前面に
            pointerEvents: "auto",
          }}
        >
          {label}
        </span>
        {/* 折り畳み・削除ボタン */}
        <div style={{ display: "flex", alignItems: "center", zIndex: 3 }}>
          <span
            className={styles.collapseBtn}
            tabIndex={0}
            role="button"
            aria-label="カテゴリをたたむ"
            style={{
              marginRight: "0.5em",
              cursor: "pointer",
              fontSize: "1.1rem",
              zIndex: 3,
              pointerEvents: "auto",
            }}
            onClick={onCollapse}
          >
            ー
          </span>
          <span
            className={styles.deleteIcon}
            onClick={onDelete}
            tabIndex={0}
            role="button"
            aria-label="カテゴリ削除"
            style={{
              marginLeft: "0",
              cursor: "pointer",
              fontSize: "1.3rem",
              zIndex: 3,
              pointerEvents: "auto",
            }}
          >
            ｘ
          </span>
        </div>
      </div>
      {/* カテゴリー内のタスクや子要素 */}
      {children}
    </motion.div>
  );
}

export default SortableCategory;