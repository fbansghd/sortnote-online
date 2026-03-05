import React from 'react';
import { useSession } from 'next-auth/react';
import type { Memo, NotesSyncState } from '@/types/notes';

/**
 * メモの初回ロードを管理するカスタムフック
 */
export function useNotesSync(
  memos: Memo[],
  setMemos: (memos: Memo[]) => void
): NotesSyncState {
  const { status } = useSession();
  const didInitialLoad = React.useRef<boolean>(false);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isReady, setIsReady] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (status !== 'authenticated' || didInitialLoad.current) {
      if (status === 'unauthenticated') {
        setIsReady(true);
      }
      return;
    }

    didInitialLoad.current = true;
    setIsLoading(true);

    (async () => {
      try {
        const res = await fetch('/api/data', { cache: 'no-store' });
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
