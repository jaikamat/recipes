/**
 * Recipe loading for the server.
 *
 * Scans the four category directories at the repo root, parses every
 * markdown file, and returns recipes + accumulated parse problems.
 * There is deliberately no cache: the collection is ~44 small files and a
 * fresh read per request (~ a few ms) guarantees a browser refresh always
 * reflects the latest hand-edits to the markdown.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RecipesResponse } from '../shared/types.js';
import { CATEGORIES } from '../shared/types.js';
import { parseRecipe } from '../shared/parser/parseRecipe.js';

/** Absolute path of the recipe repository (two levels above app/server/). */
export const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

/** Read and parse the whole collection, sorted by category then title. */
export async function loadRecipes(): Promise<RecipesResponse> {
  const response: RecipesResponse = {
    recipes: [],
    problems: [],
    generatedAt: new Date().toISOString(),
  };

  for (const category of CATEGORIES) {
    const dir = path.join(REPO_ROOT, category);
    let entries: string[];
    try {
      entries = await fs.readdir(dir);
    } catch {
      response.problems.push({
        file: category,
        line: 0,
        severity: 'error',
        message: `category directory not found: ${dir}`,
      });
      continue;
    }
    for (const entry of entries.filter((f) => f.endsWith('.md')).sort()) {
      const filePath = `${category}/${entry}`;
      const source = await fs.readFile(path.join(dir, entry), 'utf8');
      const { recipe, problems } = parseRecipe(source, category, filePath);
      response.recipes.push(recipe);
      response.problems.push(...problems);
    }
  }

  response.recipes.sort(
    (a, b) =>
      CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) ||
      a.title.localeCompare(b.title),
  );
  return response;
}
