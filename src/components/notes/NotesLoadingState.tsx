import styles from "@/styles/App.module.scss";

interface NotesLoadingStateProps {
  isAltColor: boolean;
}

/**
 * ローディング状態を表示するコンポーネント
 */
export function NotesLoadingState({ isAltColor }: NotesLoadingStateProps) {
  return (
    <div className={`${isAltColor ? styles.themeB : styles.themeA} ${styles.container}`}>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.5rem'
      }}>
        Loading...
      </div>
    </div>
  );
}
