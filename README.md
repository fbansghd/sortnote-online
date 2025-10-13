# SortNote

<p align="center">
	<img src="./public/sortnote-logo.svg" alt="SortNote ロゴ" width="160" />
</p>

SortNote は [Next.js](https://nextjs.org) で作られたドラッグ&ドロップ対応のタスク管理アプリです。Google ログインと Supabase を使用してカテゴリーとタスクを管理できます。

## はじめに

開発サーバーを起動してください：

```bash
npm run dev
# または
yarn dev
# または
pnpm dev
# または
bun dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開くとアプリが表示されます。

## 機能

- Google ログイン認証
- カテゴリーとタスクのドラッグ&ドロップ操作
- タスクの完了・未完了切り替え
- モバイル対応レスポンシブデザイン
- テーマカラー切り替え
- Supabase による自動データ同期（サインイン時の自動ロード、編集時の自動保存）

## Supabase セットアップ（開発環境）

このアプリはカテゴリーとタスクを Supabase に保存します。データの永続化を有効にするには：

1. Supabase プロジェクトの SQL エディタで `supabase-schema.sql`（リポジトリルートにあります）を実行して、`categories` と `tasks` テーブルと RLS ポリシーを作成してください。

2. `.env.local` ファイルに以下の環境変数を追加してください（秘密情報はコミットしないでください）：

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# NextAuth 設定（Google）
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=some_long_random_secret
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

3. 開発サーバーを起動してサインインしてください。メモの編集は自動的に保存され、サインイン時に既存データが自動でロードされます。

## 不要なテーブルの削除

古い `public.notes` テーブルなど不要なテーブルがある場合は、`supabase-cleanup.sql` を Supabase の SQL エディタで実行してください。

**注意**: DROP TABLE コマンドはデータを完全に削除します。実行前に必ずバックアップを取ってください。

## デプロイ

Next.js アプリをデプロイする最も簡単な方法は、Next.js の作成者による [Vercel プラットフォーム](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) を使用することです。

詳細については [Next.js デプロイメント ドキュメント](https://nextjs.org/docs/app/building-your-application/deploying) をご覧ください。
