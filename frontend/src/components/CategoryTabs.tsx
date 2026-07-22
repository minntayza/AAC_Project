import type { Category } from '../api';

interface CategoryTabsProps {
  categories: Category[];
  activeCategory: string | null;
  onCategoryChange: (id: string) => void;
}

export function CategoryTabs({ categories, activeCategory, onCategoryChange }: CategoryTabsProps) {
  const tabs = categories.filter((c) => c.id !== 'feelings');

  if (!tabs.length) return null;

  return (
    <div className="cat-tabs" role="tablist" aria-label="Categories">
      {tabs.map((cat) => (
        <button
          key={cat.id}
          className={`cat-tab${activeCategory === cat.id ? ' active' : ''}`}
          onClick={() => onCategoryChange(cat.id)}
          role="tab"
          aria-selected={activeCategory === cat.id}
        >
          {cat.name_my}
        </button>
      ))}
    </div>
  );
}
