import { useSortable } from "@dnd-kit/sortable";
import type { Transform } from "@dnd-kit/utilities";
import { CSS } from "@dnd-kit/utilities";
import styles from "@/styles/App.module.scss";
import type { ReactNode } from "react";

interface SortableCategoryProps {
  id: string;
  label: string;
  children?: ReactNode;
  isOverlay?: boolean;
  transform?: Transform | null;
  onDelete?: () => void;
  onCollapse?: () => void;
}

// ドラッグ＆ドロップ可能なカテゴリーコンポーネント
function SortableCategory({ id, label, children, isOverlay, transform: overlayTransform, onDelete, onCollapse }: SortableCategoryProps) {
  // DnD KitのuseSortableフックでドラッグ状態や属性を取得
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  // オーバーレイ表示時はoverlayTransformを使う
  const appliedTransform = isOverlay ? overlayTransform : transform;

  return (
    <div
      ref={setNodeRef}
      className={`${styles.sortableCategory}${isOverlay ? ` ${styles.sortableCategoryOverlay}` : ""}`}
      style={{
        transform: appliedTransform ? CSS.Transform.toString(appliedTransform) : undefined,
        zIndex: isDragging || isOverlay ? 10 : undefined,
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
    </div>
  );
}

export default SortableCategory;