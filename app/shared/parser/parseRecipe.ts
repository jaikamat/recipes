/**
 * Recipe markdown parser — a line-by-line state machine over the house
 * template documented in the repo's CLAUDE.md.
 *
 * Section order: TITLE → HEADER (servings/yield/macros) → DESCRIPTION →
 * INGREDIENTS → INSTRUCTIONS → EXTRAS (Freeze/Thaw/Reheat/Serve/Storage/Notes).
 *
 * Tolerated real-world deviations (all present in the corpus):
 * - a `TODO ...` line above the Servings line (unverified recipes)
 * - an extra `**Per 100g:** ...` macros line with a trailing `(...)` note
 * - servings suffixes: `4 (690g each)`, `14 meatballs`, `12 muffins`
 * - pantry recipes with `**Yield:**` instead of servings — and one with both
 *   Yield and Per-serving macros (date-paste)
 * - `_Phase:_` headings inside Instructions, with step numbering continuing
 *   across phases (turkey-bao-buns)
 * - extras in inline form (`**Freeze:** text`) or block form (a bare
 *   `**Notes:**` header followed by bullets/paragraphs)
 *
 * Invariant: NEVER throws. Always returns a best-effort Recipe plus a list
 * of problems, so one bad hand-edit never blanks the whole app.
 */
import type {
  Category,
  ExtraKind,
  ExtraSection,
  IngredientGroup,
  InstructionPhase,
  Macros,
  ParseProblem,
  Recipe,
} from '../types.js';
import { parseIngredient } from './parseIngredient.js';

/** Result of parsing one markdown file. */
export interface ParseResult {
  recipe: Recipe;
  problems: ParseProblem[];
}

const MACRO_LINE =
  /^([\d.]+)\s*cal\s*\|\s*([\d.]+)\s*g protein\s*\|\s*([\d.]+)\s*g fat\s*\|\s*([\d.]+)\s*g carbs$/;

const EXTRA_KINDS: readonly ExtraKind[] = [
  'Freeze',
  'Thaw',
  'Reheat',
  'Serve',
  'Storage',
  'Notes',
];

function parseMacros(text: string): Macros | null {
  const m = text.trim().match(MACRO_LINE);
  if (!m) return null;
  return {
    calories: Number(m[1]),
    protein: Number(m[2]),
    fat: Number(m[3]),
    carbs: Number(m[4]),
  };
}

/**
 * Parse one recipe markdown file.
 *
 * @param source   full file contents
 * @param category which directory the file lives in
 * @param filePath repo-relative path, used in problem messages and Recipe.filePath
 */
export function parseRecipe(
  source: string,
  category: Category,
  filePath: string,
): ParseResult {
  const problems: ParseProblem[] = [];
  const warn = (line: number, message: string) =>
    problems.push({ file: filePath, line, severity: 'warning', message });
  const error = (line: number, message: string) =>
    problems.push({ file: filePath, line, severity: 'error', message });

  const slug = filePath.split('/').pop()!.replace(/\.md$/, '');
  const recipe: Recipe = {
    id: `${category}/${slug}`,
    category,
    filePath,
    title: '',
    ingredients: [],
    instructions: [],
    extras: [],
  };

  type State = 'header' | 'ingredients' | 'instructions' | 'extras';
  let state: State = 'header';
  const descriptionLines: string[] = [];
  let currentGroup: IngredientGroup | null = null;
  let currentPhase: InstructionPhase | null = null;
  let currentExtra: ExtraSection | null = null;

  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    const lineNo = i + 1;
    if (line === '') continue;

    // ---- Global markers (recognized in any state) ------------------------

    const title = line.match(/^###\s+(.+)$/);
    if (title) {
      if (recipe.title) error(lineNo, 'second ### title in file');
      else recipe.title = title[1]!.trim();
      continue;
    }
    if (/^#{1,2}(?!#)|^####/.test(line)) {
      warn(lineNo, `unexpected heading level: "${line}"`);
      continue;
    }

    const ingredientsHeader = line.match(/^\*\*Ingredients:\*\*$/);
    if (ingredientsHeader) {
      state = 'ingredients';
      currentGroup = null;
      continue;
    }
    const instructionsHeader = line.match(/^\*\*Instructions:\*\*$/);
    if (instructionsHeader) {
      state = 'instructions';
      currentPhase = null;
      continue;
    }

    const boldHeader = line.match(/^\*\*([A-Za-z][A-Za-z0-9 ]*):\*\*\s*(.*)$/);
    if (boldHeader) {
      const name = boldHeader[1]!;
      const rest = boldHeader[2]!.trim();

      if (name === 'Servings') {
        const m = rest.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
        if (m) {
          recipe.servings = {
            count: Number(m[1]),
            suffix: m[2] ? m[2].trim() : undefined,
            raw: rest,
          };
        } else {
          error(lineNo, `unparseable Servings value: "${rest}"`);
        }
        continue;
      }
      if (name === 'Yield') {
        recipe.yield = rest;
        continue;
      }
      if (name === 'Per serving') {
        const macros = parseMacros(rest);
        if (macros) recipe.perServing = macros;
        else error(lineNo, `unparseable Per serving macros: "${rest}"`);
        continue;
      }
      if (name === 'Per 100g') {
        // Optional trailing note: "... 11g carbs (~160g per serving)"
        const noteMatch = rest.match(/^(.*?)\s*\(([^)]*)\)$/);
        const macroText = noteMatch ? noteMatch[1]! : rest;
        const macros = parseMacros(macroText);
        if (macros) {
          recipe.per100g = { macros, note: noteMatch ? noteMatch[2] : undefined };
        } else {
          warn(lineNo, `unparseable Per 100g macros: "${rest}"`);
        }
        continue;
      }
      if ((EXTRA_KINDS as readonly string[]).includes(name)) {
        state = 'extras';
        currentExtra = { kind: name as ExtraKind };
        if (rest) currentExtra.text = rest;
        recipe.extras.push(currentExtra);
        continue;
      }
      // Unknown bold header: keep its content visible rather than dropping it.
      warn(lineNo, `unknown section header "**${name}:**" — treating like Notes`);
      state = 'extras';
      currentExtra = { kind: 'Notes', text: rest ? `${name}: ${rest}` : `${name}:` };
      recipe.extras.push(currentExtra);
      continue;
    }

    // ---- State-specific lines --------------------------------------------

    if (state === 'header') {
      const todo = line.match(/^TODO[:.]?\s*(.*)$/i);
      if (todo) {
        recipe.todo = todo[1] || 'TODO';
        continue;
      }
      // Anything else before **Ingredients:** is the description paragraph.
      descriptionLines.push(line);
      continue;
    }

    if (state === 'ingredients') {
      const subgroup = line.match(/^_(.+):_$/);
      if (subgroup) {
        currentGroup = { heading: subgroup[1]!.trim(), items: [] };
        recipe.ingredients.push(currentGroup);
        continue;
      }
      const bullet = line.match(/^-\s+(.*)$/);
      if (bullet) {
        if (!currentGroup) {
          currentGroup = { items: [] };
          recipe.ingredients.push(currentGroup);
        }
        currentGroup.items.push(parseIngredient(bullet[1]!));
        continue;
      }
      if (/^_.*_$/.test(line)) {
        warn(
          lineNo,
          `italic line in ingredients is not a "_Name:_" sub-group: "${line}"`,
        );
        continue;
      }
      warn(lineNo, `unrecognized line in ingredients: "${line}"`);
      continue;
    }

    if (state === 'instructions') {
      const phase = line.match(/^_(.+):_$/);
      if (phase) {
        currentPhase = { heading: phase[1]!.trim(), steps: [] };
        recipe.instructions.push(currentPhase);
        continue;
      }
      const step = line.match(/^(\d+)\.\s+(.*)$/);
      if (step) {
        if (!currentPhase) {
          currentPhase = { steps: [] };
          recipe.instructions.push(currentPhase);
        }
        currentPhase.steps.push({ number: Number(step[1]), text: step[2]! });
        continue;
      }
      // Forward-tolerant: fold stray prose into the previous step.
      const lastStep = currentPhase?.steps[currentPhase.steps.length - 1];
      if (lastStep) {
        warn(
          lineNo,
          `unnumbered line in instructions folded into step ${lastStep.number}`,
        );
        lastStep.text += ` ${line}`;
      } else {
        warn(lineNo, `unrecognized line in instructions: "${line}"`);
      }
      continue;
    }

    // state === 'extras': continuation of the current extra section.
    if (currentExtra) {
      const bullet = line.match(/^-\s+(.*)$/);
      if (bullet) {
        (currentExtra.bullets ??= []).push(bullet[1]!);
      } else {
        currentExtra.text = currentExtra.text ? `${currentExtra.text} ${line}` : line;
      }
      continue;
    }
    warn(lineNo, `unrecognized line: "${line}"`);
  }

  if (descriptionLines.length > 0) recipe.description = descriptionLines.join(' ');

  // ---- Structural validation ---------------------------------------------

  if (!recipe.title) error(1, 'missing ### title');
  if (recipe.ingredients.every((g) => g.items.length === 0)) {
    error(1, 'no ingredients found');
  }
  const allSteps = recipe.instructions.flatMap((p) => p.steps);
  if (allSteps.length === 0) error(1, 'no instruction steps found');
  for (let s = 1; s < allSteps.length; s++) {
    if (allSteps[s]!.number !== allSteps[s - 1]!.number + 1) {
      warn(
        1,
        `step numbering jumps from ${allSteps[s - 1]!.number} to ${allSteps[s]!.number}`,
      );
      break;
    }
  }
  if (category === 'pantry') {
    if (!recipe.yield && !recipe.servings) {
      error(1, 'pantry recipe missing **Yield:** (or **Servings:**)');
    }
  } else {
    if (!recipe.servings) error(1, 'missing **Servings:**');
    if (!recipe.perServing) error(1, 'missing **Per serving:** macros');
  }

  return { recipe, problems };
}
