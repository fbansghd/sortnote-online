type DbCategory = {
  id: string;
  user_id: string;
  title: string;
  sort_index: number;
  collapsed: boolean;
  created_at: string;
};

type DbTask = {
  id: string;
  category_id: string;
  text: string;
  done: boolean;
  sort_index: number;
  created_at: string;
};

export function composeMemos(cats: DbCategory[], tasks: DbTask[]) {
  return cats.map((cat) => ({
    id: cat.id,
    category: cat.title,
    sort_index: cat.sort_index,
    collapsed: cat.collapsed ?? false,
    tasks: tasks.filter((t) => t.category_id === cat.id).map((t) => ({
      id: t.id,
      text: t.text,
      done: t.done,
      created_at: t.created_at,
    })),
  }));
}
