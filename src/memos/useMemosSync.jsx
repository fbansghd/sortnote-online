import React from 'react';
import { useSession } from 'next-auth/react';

/**
 * メモの自動ロード・自動保存を管理するカスタムフック
 * @param {Array} memos - メモの配列
 * @param {Function} setMemos - メモを更新する関数
 */
export function useMemosSync(memos, setMemos) {
  const { status } = useSession();
  const didInitialLoad = React.useRef(false);
  const lastServerHash = React.useRef(null);

  const hash = React.useCallback((v) => {
    try { return JSON.stringify(v); } catch { return String(Math.random()); }
  }, []);

  // 初回ロード：サーバー優先（localStorage不使用）
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
          // 送信用ハッシュはクリーンペイロードで管理（idとcollapsedも含める）
          const cleaned = serverMemos.map((c, i) => ({
            id: c.id,
            category: c.category,
            sort_index: i,
            collapsed: !!c.collapsed,
            tasks: (Array.isArray(c.tasks) ? c.tasks : []).map(t => ({
              id: t.id,
              text: t.text ?? '',
              done: !!t.done,
            })),
          }));

          lastServerHash.current = JSON.stringify({ memos: cleaned });
        }
      } catch (e) {
        console.error('[sync] initial load failed:', e);
      }
    })();
  }, [status, setMemos]);

  // 自動保存
  React.useEffect(() => {
    if (status !== 'authenticated') return;
    if (!Array.isArray(memos)) return;
    // 初回ロードが完了するまで自動保存しない
    if (!didInitialLoad.current) return;
    // 空のmemosは保存しない（データ消失防止）
    if (memos.length === 0) return;

    const cleaned = memos.map((c, i) => ({
      id: c.id,
      category: c.category,
      sort_index: i,
      collapsed: !!c.collapsed,
      tasks: (Array.isArray(c.tasks) ? c.tasks : []).map(t => ({
        id: t.id,
        text: t.text ?? '',
        done: !!t.done,
      })),
    }));

    const outgoing = { memos: cleaned };
    const outgoingHash = JSON.stringify(outgoing);
    if (outgoingHash === lastServerHash.current) return;

    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(outgoing),
        });
        const data = await res.json().catch(() => null);
        if (res.ok) {
          // 自動保存では絶対にsetMemosを呼ばない（無限ループ防止）
          lastServerHash.current = outgoingHash;
        } else {
          console.error('[sync] save failed:', res.status, data);
        }
      } catch (e) {
        console.error('[sync] save error:', e);
      }
    }, 1200);

    return () => clearTimeout(t);
  }, [status, memos, setMemos]);
}
