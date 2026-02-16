import React from 'react';
import { useSession } from 'next-auth/react';

/**
 * メモの初回ロードを管理するカスタムフック
 * @param {Function} setMemos - メモを更新する関数
 * @returns {{ isLoading: boolean, isReady: boolean }} ロード状態
 */
export function useNotesSync(memos, setMemos) {
  const { status } = useSession();
  const didInitialLoad = React.useRef(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isReady, setIsReady] = React.useState(false);

  // 初回ロード：サーバー優先
  React.useEffect(() => {
    if (status !== 'authenticated' || didInitialLoad.current) {
      // 認証されていない場合もreadyにする（ログイン画面など）
      if (status === 'unauthenticated') {
        setIsReady(true);
      }
      return;
    }

    didInitialLoad.current = true;
    setIsLoading(true);

    (async () => {
      try {
        const res = await fetch('/api/notes', { cache: 'no-store' });
        if (!res.ok) {
          setIsReady(true);
          setIsLoading(false);
          return;
        }
        const data = await res.json();
        const serverMemos = Array.isArray(data?.memos) ? data.memos : null;
        if (serverMemos) {
          setMemos(serverMemos);
        }
      } catch (e) {
        console.error('[sync] initial load failed:', e);
      } finally {
        setIsReady(true);
        setIsLoading(false);
      }
    })();
  }, [status, setMemos]);

  return { isLoading, isReady };
}
