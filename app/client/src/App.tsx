/**
 * App shell: top navigation, parse-problems banner, routes.
 */
import { useState } from 'react';
import { NavLink, Route, Routes } from 'react-router';
import { useRecipes } from './hooks/useRecipes';
import RecipeListPage from './pages/RecipeListPage';
import CookPage from './pages/CookPage';
import ShoppingPage from './pages/ShoppingPage';
import PlannerPage from './pages/PlannerPage';

/** Banner shown when any markdown file has parse problems. */
function ProblemsBanner() {
  const { data } = useRecipes();
  const [dismissed, setDismissed] = useState(false);
  const problems = data?.problems ?? [];
  if (problems.length === 0 || dismissed) return null;

  const errors = problems.filter((p) => p.severity === 'error').length;
  return (
    <div className={`banner ${errors > 0 ? 'banner-error' : 'banner-warning'}`}>
      <span>
        {problems.length} recipe parse problem{problems.length === 1 ? '' : 's'} — run{' '}
        <code>npm run validate</code> in app/ for details:
      </span>
      <ul>
        {problems.slice(0, 5).map((p, i) => (
          <li key={i}>
            {p.file}:{p.line} — {p.message}
          </li>
        ))}
        {problems.length > 5 && <li>…and {problems.length - 5} more</li>}
      </ul>
      <button onClick={() => setDismissed(true)}>Dismiss</button>
    </div>
  );
}

export default function App() {
  const { error, refresh } = useRecipes();

  return (
    <div className="app">
      <nav className="topnav no-print">
        <span className="topnav-brand">🍳 Family Recipes</span>
        <NavLink to="/" end>
          Recipes
        </NavLink>
        <NavLink to="/shopping">Shopping List</NavLink>
        <NavLink to="/planner">Weekly Planner</NavLink>
      </nav>
      <ProblemsBanner />
      {error && (
        <div className="banner banner-error">
          Could not load recipes ({error}). <button onClick={refresh}>Try again</button>
        </div>
      )}
      <main className="content">
        <Routes>
          <Route path="/" element={<RecipeListPage />} />
          <Route path="/recipe/:category/:slug" element={<CookPage />} />
          <Route path="/shopping" element={<ShoppingPage />} />
          <Route path="/planner" element={<PlannerPage />} />
        </Routes>
      </main>
    </div>
  );
}
