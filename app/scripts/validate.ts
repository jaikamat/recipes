/**
 * Recipe collection validator — `npm run validate` (add -v for detail).
 *
 * Parses every recipe and reports problems as `file:line [severity] message`.
 * Exits 1 when any error is found, so it can guard commits or bulk edits.
 *
 * With -v it also lists every ingredient line the parser could not
 * structure ("Salt to taste", etc.) — those aggregate verbatim in shopping
 * lists, so the list shows what manual checking they will need.
 */
import { loadRecipes } from '../server/recipes.js';

const verbose = process.argv.includes('-v') || process.argv.includes('--verbose');

const { recipes, problems } = await loadRecipes();

for (const p of problems) {
  console.log(`${p.file}:${p.line} [${p.severity}] ${p.message}`);
}

let parsedCount = 0;
const unparsed: { file: string; raw: string }[] = [];
for (const recipe of recipes) {
  for (const group of recipe.ingredients) {
    for (const item of group.items) {
      if (item.parsed) parsedCount++;
      else unparsed.push({ file: recipe.filePath, raw: item.raw });
    }
  }
}

if (verbose && unparsed.length > 0) {
  console.log('\nIngredient lines without a structured quantity (pass through as-is):');
  for (const u of unparsed) console.log(`  ${u.file}: "${u.raw}"`);
}

const errors = problems.filter((p) => p.severity === 'error').length;
const warnings = problems.filter((p) => p.severity === 'warning').length;
const total = parsedCount + unparsed.length;

console.log(
  `\n${recipes.length} recipes, ${errors} error${errors === 1 ? '' : 's'}, ` +
    `${warnings} warning${warnings === 1 ? '' : 's'}. ` +
    `Ingredients: ${parsedCount}/${total} structured (${unparsed.length} pass-through).`,
);

process.exit(errors > 0 ? 1 : 0);
