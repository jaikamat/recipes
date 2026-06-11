/**
 * Typed access to the server API (one endpoint).
 */
import type { RecipesResponse } from '@shared/types';

/** Fetch the full recipe collection, parsed fresh from markdown. */
export async function fetchRecipes(): Promise<RecipesResponse> {
  const res = await fetch('/api/recipes');
  if (!res.ok) throw new Error(`GET /api/recipes failed: ${res.status}`);
  return res.json();
}
