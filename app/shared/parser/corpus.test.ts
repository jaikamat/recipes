/**
 * Golden corpus test: parses every real recipe file in the repository.
 *
 * This is the regression net for BOTH the parser and the recipe collection:
 * - if a parser change breaks a real file, this fails;
 * - if a hand-edited recipe drifts from the template, this fails.
 *
 * If a new, intentional deviation appears, either teach the parser or add
 * the exact warning message to WARNING_ALLOWLIST below.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import type { Category } from '../types.js';
import { CATEGORIES } from '../types.js';
import { parseRecipe } from './parseRecipe.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/** Known-and-accepted warnings, as exact `file: message` strings. */
const WARNING_ALLOWLIST: string[] = [];

function listRecipeFiles(): { category: Category; filePath: string }[] {
  return CATEGORIES.flatMap((category) =>
    fs
      .readdirSync(path.join(REPO_ROOT, category))
      .filter((f) => f.endsWith('.md'))
      .map((f) => ({ category, filePath: `${category}/${f}` })),
  );
}

describe('golden corpus', () => {
  const files = listRecipeFiles();

  test('finds the recipe collection', () => {
    expect(files.length).toBeGreaterThanOrEqual(40);
  });

  test.each(files)('$filePath parses cleanly', ({ category, filePath }) => {
    const source = fs.readFileSync(path.join(REPO_ROOT, filePath), 'utf8');
    const { recipe, problems } = parseRecipe(source, category, filePath);

    const errors = problems.filter((p) => p.severity === 'error');
    expect(errors).toEqual([]);

    const unexpectedWarnings = problems
      .filter((p) => p.severity === 'warning')
      .filter((p) => !WARNING_ALLOWLIST.includes(`${p.file}: ${p.message}`));
    expect(unexpectedWarnings).toEqual([]);

    expect(recipe.title).not.toBe('');
    expect(recipe.instructions.flatMap((p) => p.steps).length).toBeGreaterThan(0);
  });

  test('every non-pantry recipe has servings and macros', () => {
    for (const { category, filePath } of files) {
      if (category === 'pantry') continue;
      const source = fs.readFileSync(path.join(REPO_ROOT, filePath), 'utf8');
      const { recipe } = parseRecipe(source, category, filePath);
      expect(recipe.servings, filePath).toBeDefined();
      expect(recipe.perServing, filePath).toBeDefined();
    }
  });

  test('most ingredient lines parse (aggregation coverage)', () => {
    let parsed = 0;
    let total = 0;
    for (const { category, filePath } of files) {
      const source = fs.readFileSync(path.join(REPO_ROOT, filePath), 'utf8');
      const { recipe } = parseRecipe(source, category, filePath);
      for (const group of recipe.ingredients) {
        for (const item of group.items) {
          total++;
          if (item.parsed) parsed++;
        }
      }
    }
    // "Salt to taste"-style lines are expected to be unparsed; everything
    // with a leading quantity should parse. Keep a generous floor so this
    // only trips on real regressions.
    expect(parsed / total).toBeGreaterThan(0.9);
  });
});
