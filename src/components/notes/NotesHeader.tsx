import { signOut } from 'next-auth/react';
import styles from "@/styles/App.module.scss";

interface NotesHeaderProps {
  isAltColor: boolean;
  setIsAltColor: (value: boolean | ((prev: boolean) => boolean)) => void;
  showSidebar: boolean;
  setShowSidebar: (value: boolean | ((prev: boolean) => boolean)) => void;
  isAuthenticated: boolean;
}

/**
 * ヘッダーコンポーネント
 * タイトル、テーマ切替、サイドバー切替、ログアウトボタンを含む
 */
export function NotesHeader({
  isAltColor,
  setIsAltColor,
  showSidebar,
  setShowSidebar,
  isAuthenticated
}: NotesHeaderProps) {
  return (
    <>
      <div className={styles.header}>
        <div className={styles.headerContainer}>
          <div className={styles.title}>SortNote</div>
          <div className={styles.toggleContainer}>
            <div>Theme Color</div>
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={isAltColor}
                onChange={() => setIsAltColor((prev) => !prev)}
              />
              <span className={styles.slider}></span>
            </label>
          </div>
          <div className={styles.toggleContainer}>
            <div>Memobox</div>
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={showSidebar}
                onChange={() => setShowSidebar((prev) => !prev)}
              />
              <span className={styles.slider}></span>
            </label>
          </div>
        </div>
        {isAuthenticated && (
          <button
            className={styles.logoutBtn}
            onClick={() => signOut({ callbackUrl: '/login' })}
            aria-label="ログアウト"
          >
            logout
          </button>
        )}
      </div>
      <br />
    </>
  );
}
