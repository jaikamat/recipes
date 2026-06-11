/**
 * Home page: the whole collection by category, with search and macro sorts.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { Recipe } from '@shared/types';
import { CATEGORIES } from '@shared/types';
import { useRecipes } from '../hooks/useRecipes';
import MacroChips from '../components/MacroChips';

type SortKey = 'name' | 'calories' | 'protein' | 'protein-density';

const SORTS: Record<
  SortKey,
  { label: string; compare: (a: Recipe, b: Recipe) => number }
> = {
  name: { label: 'Name', compare: (a, b) => a.title.localeCompare(b.title) },
  calories: {
    label: 'Calories (low → high)',
    compare: (a, b) =>
      (a.perServing?.calories ?? Infinity) - (b.perServing?.calories ?? Infinity),
  },
  protein: {
    label: 'Protein (high → low)',
    compare: (a, b) => (b.perServing?.protein ?? -1) - (a.perServing?.protein ?? -1),
  },
  'protein-density': {
    label: 'Protein per 100 cal (high → low)',
    compare: (a, b) => proteinDensity(b) - proteinDensity(a),
  },
};

function proteinDensity(r: Recipe): number {
  if (!r.perServing || r.perServing.calories === 0) return -1;
  return (r.perServing.protein / r.perServing.calories) * 100;
}

/** Case-insensitive match against title and all ingredient text. */
function matches(recipe: Recipe, query: string): boolean {
  const q = query.toLowerCase();
  if (recipe.title.toLowerCase().includes(q)) return true;
  return recipe.ingredients.some((g) =>
    g.items.some((i) => i.raw.toLowerCase().includes(q)),
  );
}

export default function RecipeListPage() {
  const { data } = useRecipes();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('name');

  const recipes = useMemo(() => {
    let list = data?.recipes ?? [];
    if (query.trim()) list = list.filter((r) => matches(r, query.trim()));
    return [...list].sort(SORTS[sort].compare);
  }, [data, query, sort]);

  if (!data) return <p className="muted">Loading recipes…</p>;

  return (
    <div>
      <div className="list-controls">
        <input
          type="search"
          placeholder="Search recipes or ingredients…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <label>
          Sort:{' '}
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            {Object.entries(SORTS).map(([key, s]) => (
              <option key={key} value={key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {CATEGORIES.map((category) => {
        const inCategory = recipes.filter((r) => r.category === category);
        if (inCategory.length === 0) return null;
        return (
          <section key={category}>
            <h2 className="category-header">{category}</h2>
            <ul className="recipe-list">
              {inCategory.map((r) => (
                <li key={r.id} className="recipe-card">
                  <Link to={`/recipe/${r.id}`} className="recipe-card-link">
                    <span className="recipe-card-title">
                      {r.title}
                      {r.todo && (
                        <span className="todo-badge" title={r.todo}>
                          untested
                        </span>
                      )}
                    </span>
                    <span className="recipe-card-meta">
                      {r.servings && (
                        <span className="muted">
                          {r.servings.count} {r.servings.suffix || 'servings'}
                        </span>
                      )}
                      {r.yield && <span className="muted">Yield: {r.yield}</span>}
                      {r.perServing && <MacroChips macros={r.perServing} />}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {recipes.length === 0 && <p className="muted">No recipes match “{query}”.</p>}
    </div>
  );
}
