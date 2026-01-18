import React from 'react';
import { useSession } from 'next-auth/react';

/**
 * メモの初回ロードを管理するカスタムフック
 * @param {Function} setMemos - メモを更新する関数
 */
export function useMemosSync(memos, setMemos) {
  const { status } = useSession();
  const didInitialLoad = React.useRef(false);

  // 初回ロード：サーバー優先
  React.useEffect(() => {
    if (status !== 'authenticated' || didInitialLoad.current) return;
    didInitialLoad.current = true;
    (async () => {
      try {
        const res = await fetch('/api/notes', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const serverMemos = Array.isArray(data?.memos) ? data.memos : null;
        if (serverMemos) {
          setMemos(serverMemos);
        }
      } catch (e) {
        console.error('[sync] initial load failed:', e);
      }
    })();
  }, [status, setMemos]);
}
