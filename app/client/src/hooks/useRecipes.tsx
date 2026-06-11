/**
 * Shared recipe data for the whole app.
 *
 * One fetch on mount, re-fetched whenever the window regains focus — so the
 * workflow "tweak the markdown in an editor, Cmd-Tab back to the browser"
 * shows the change without a manual reload.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Recipe, RecipesResponse } from '@shared/types';
import { fetchRecipes } from '../api';

interface RecipesState {
  /** undefined while the first load is in flight */
  data?: RecipesResponse;
  /** message when the last fetch failed (server down, etc.) */
  error?: string;
  refresh: () => void;
  /** Look up one recipe by its "category/slug" id. */
  byId: (id: string) => Recipe | undefined;
}

const RecipesContext = createContext<RecipesState | null>(null);

export function RecipesProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<RecipesResponse>();
  const [error, setError] = useState<string>();

  const refresh = useCallback(() => {
    fetchRecipes()
      .then((d) => {
        setData(d);
        setError(undefined);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [refresh]);

  const byId = useCallback(
    (id: string) => data?.recipes.find((r) => r.id === id),
    [data],
  );

  return (
    <RecipesContext.Provider value={{ data, error, refresh, byId }}>
      {children}
    </RecipesContext.Provider>
  );
}

/** Access the shared recipe collection; must be under RecipesProvider. */
export function useRecipes(): RecipesState {
  const ctx = useContext(RecipesContext);
  if (!ctx) throw new Error('useRecipes must be used within RecipesProvider');
  return ctx;
}
