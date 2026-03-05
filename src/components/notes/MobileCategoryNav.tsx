import styles from "@/styles/App.module.scss";

const ARROW_SIZE = 35;
const ARROW_STROKE_WIDTH = 2;

interface MobileCategoryNavProps {
  direction: 'left' | 'right';
  onClick: () => void;
}

/**
 * モバイル用カテゴリーナビゲーションボタン
 */
export function MobileCategoryNav({ direction, onClick }: MobileCategoryNavProps) {
  const isLeft = direction === 'left';
  const ariaLabel = isLeft ? '前のカテゴリー' : '次のカテゴリー';
  const containerClass = isLeft ? styles.arrowLeft : styles.arrowRight;

  return (
    <div className={containerClass}>
      <button
        className={styles.categoryArrowBtn}
        onClick={onClick}
        aria-label={ariaLabel}
      >
        <svg
          width={ARROW_SIZE}
          height={ARROW_SIZE}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          focusable="false"
          style={isLeft ? { transform: 'rotate(180deg)' } : undefined}
        >
          <path
            d="M9 6l6 6-6 6"
            stroke="var(--arrow-color)"
            strokeWidth={ARROW_STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
