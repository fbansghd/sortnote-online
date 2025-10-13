-- Cleanup script (run manually in Supabase SQL editor)
-- WARNING: These DROP TABLE statements will permanently delete data. Run only if you are sure.

-- Drop the legacy notes table if present
DROP TABLE IF EXISTS public.notes;

-- If you have other old tables you want to remove, add them here, for example:
-- DROP TABLE IF EXISTS public.old_table_name;

-- If you want to remove the old NextAuth / Supabase auth tables, do NOT run these here unless you really mean to
-- DROP TABLE IF EXISTS auth.users;

-- End of cleanup script
