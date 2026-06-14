/**
 * Nutrition reference table for the macro audit (scripts/audit-macros.ts).
 *
 * Keyed by the parser's normalized ingredient name (lowercase), AFTER
 * plural folding (trailing "s" stripped — "eggs" → "egg"). Values are
 * USDA FoodData Central or typical US product labels.
 *
 * Each entry gives macros per 100g, plus optional conversion helpers:
 * - density: grams per ml, for ingredients measured by volume
 * - piece:   grams per counted item ("1 onion", "2 scoops")
 * - lowConfidence: true when the value is a best guess (brand/label
 *   unknown) — the audit report calls these out so they can be corrected
 *   from a real label.
 *
 * Per-100g macro fields: cal, p (protein g), f (fat g), c (carbs g).
 */

export interface NutritionEntry {
  cal: number;
  p: number;
  f: number;
  c: number;
  /** grams per ml (volume ingredients). Water-like defaults to 1.0. */
  density?: number;
  /** grams per counted piece ("1 onion" → 150g). */
  piece?: number;
  /** Value is a guess; verify against the real product label. */
  lowConfidence?: boolean;
}

export const ZERO: NutritionEntry = { cal: 0, p: 0, f: 0, c: 0, density: 1 };

export const NUTRITION: Record<string, NutritionEntry> = {
  // ---- Proteins -----------------------------------------------------------
  'ground turkey': { cal: 150, p: 19, f: 8, c: 0 }, // 93/7 raw
  'lean ground turkey': { cal: 107, p: 25, f: 1.3, c: 0 }, // 99/1 (bao buns)
  'ground turkey (taco seasoned) or ground turkey + low-sodium taco seasoning packet': {
    cal: 160,
    p: 19,
    f: 8,
    c: 2,
    lowConfidence: true, // turkey + seasoning
  },
  '90% lean ground pork': { cal: 176, p: 20, f: 10, c: 0, lowConfidence: true },
  'chicken breast': { cal: 120, p: 22.5, f: 2.6, c: 0 },
  'boneless skinless chicken breast': { cal: 120, p: 22.5, f: 2.6, c: 0 },
  'amylu paleo chicken andouille': {
    cal: 165,
    p: 15,
    f: 10.5,
    c: 1,
    lowConfidence: true,
  },
  'turkey italian sausage': { cal: 140, p: 17, f: 8, c: 1, lowConfidence: true },
  'italian sausage': { cal: 290, p: 16, f: 25, c: 2, lowConfidence: true }, // pork assumed
  'batch breakfast sausage': { cal: 0, p: 0, f: 0, c: 0 }, // resolved from the recipe by the script
  ham: { cal: 145, p: 21, f: 6, c: 1.5 },
  bacon: { cal: 540, p: 37, f: 42, c: 1.4, piece: 12 }, // cooked, per strip
  egg: { cal: 143, p: 12.6, f: 9.5, c: 0.7, piece: 50 },
  'egg white': { cal: 52, p: 11, f: 0.2, c: 0.7, piece: 33 },
  'extra firm tofu': { cal: 90, p: 10, f: 5, c: 2 },
  'soft tofu': { cal: 60, p: 6.5, f: 3.5, c: 1.8 },

  // ---- Dairy --------------------------------------------------------------
  'fairlife 2% ultra-filtered milk': { cal: 50, p: 5.4, f: 1.9, c: 2.5, density: 1.03 },
  'fairlife 2% ultra-filtered milk (or water)': {
    cal: 50,
    p: 5.4,
    f: 1.9,
    c: 2.5,
    density: 1.03,
  },
  // non-dairy — label: per 1 cup (224g) 70cal, 8P, 4.5F, 0C
  'ripple unsweetened original pea milk': { cal: 31, p: 3.6, f: 2, c: 0, density: 0.93 },
  cheddar: { cal: 403, p: 23, f: 33, c: 3, density: 0.47 }, // shredded, ~113g/cup
  parmesan: { cal: 431, p: 38, f: 29, c: 4 },
  'parmesan (parmigiano reggiano)': { cal: 431, p: 38, f: 29, c: 4 },
  '0% cottage cheese': { cal: 70, p: 12, f: 0, c: 5 },
  'ricotta cheese': { cal: 174, p: 11, f: 13, c: 3 },
  'light cream cheese': { cal: 233, p: 8, f: 18, c: 8, lowConfidence: true },
  'fresh mozzarella': { cal: 280, p: 18, f: 22, c: 2 },
  yogurt: { cal: 61, p: 3.5, f: 3.3, c: 4.7, lowConfidence: true }, // plain whole assumed
  'sour cream': { cal: 198, p: 2.4, f: 19, c: 4.6 },
  butter: { cal: 717, p: 0.9, f: 81, c: 0.1, density: 0.95, piece: 113 }, // piece = 1 stick
  ghee: { cal: 900, p: 0, f: 100, c: 0, density: 0.91 },

  // ---- Oils & fats --------------------------------------------------------
  'olive oil': { cal: 884, p: 0, f: 100, c: 0, density: 0.91 },
  'sesame oil': { cal: 884, p: 0, f: 100, c: 0, density: 0.92 },
  'crunchy peanut butter': { cal: 588, p: 25, f: 50, c: 20 },
  'peanut butter': { cal: 588, p: 25, f: 50, c: 20 },
  'raw almond butter': { cal: 614, p: 21, f: 56, c: 19 },
  'pbfit peanut butter powder': { cal: 437, p: 50, f: 12.5, c: 31 },

  // ---- Grains, flours, starches ------------------------------------------
  '00 flour': { cal: 364, p: 11, f: 1, c: 76, density: 0.53 },
  'oat flour': { cal: 404, p: 15, f: 9, c: 66, density: 0.4 },
  'almond flour': { cal: 571, p: 21, f: 50, c: 21, density: 0.41 },
  'ground almond': { cal: 571, p: 21, f: 50, c: 21 },
  'rolled oat': { cal: 379, p: 13, f: 6.5, c: 67, density: 0.34 },
  cornstarch: { cal: 381, p: 0.3, f: 0.1, c: 91, density: 0.54 },
  breadcrumb: { cal: 395, p: 13, f: 5.3, c: 72 },
  'basmati rice': { cal: 365, p: 7.5, f: 0.6, c: 80, density: 0.85 }, // dry
  'uncooked basmati rice': { cal: 365, p: 7.5, f: 0.6, c: 80, density: 0.85 },
  polenta: { cal: 362, p: 8, f: 2, c: 79, density: 0.65 }, // dry cornmeal
  'martha white self-rising cornmeal': {
    cal: 370,
    p: 8,
    f: 3.5,
    c: 77,
    lowConfidence: true,
  },
  'vital wheat gluten': { cal: 370, p: 75, f: 2, c: 14 },
  'active dry yeast': { cal: 325, p: 40, f: 8, c: 41, density: 0.65 },
  // Carbe Diem label: per 56g dry — 110 cal, 8P, 0.5F, 40C (24g fiber).
  // Carbs here are TOTAL carbs, matching the house macro convention.
  'carbe diem spaghetti': { cal: 196, p: 14.3, f: 0.9, c: 71.4 },
  'carbe diem elbow pasta': { cal: 196, p: 14.3, f: 0.9, c: 71.4 },
  'leftover bread stuffing': {
    cal: 195,
    p: 4,
    f: 8,
    c: 26,
    density: 0.42,
    lowConfidence: true,
  },

  // ---- Sweeteners ---------------------------------------------------------
  'granulated sugar': { cal: 387, p: 0, f: 0, c: 100, density: 0.85 },
  'brown sugar': { cal: 380, p: 0, f: 0, c: 98, density: 0.81 },
  'coconut sugar': { cal: 375, p: 0, f: 0, c: 94, density: 0.75 },
  erythritol: { cal: 0, p: 0, f: 0, c: 0, density: 0.8 },
  honey: { cal: 304, p: 0.3, f: 0, c: 82, density: 1.42 },
  'maple syrup': { cal: 260, p: 0, f: 0, c: 67, density: 1.32 },
  molasses: { cal: 290, p: 0, f: 0, c: 75, density: 1.4 },

  // ---- Chocolate & baking -------------------------------------------------
  'chocolate chip': { cal: 500, p: 3.5, f: 28.6, c: 64.3, density: 0.72 }, // Toll House semisweet label
  'chocolate chips (toll house)': { cal: 500, p: 3.5, f: 28.6, c: 64.3 },
  'dutch process cocoa powder': { cal: 228, p: 19.6, f: 13.7, c: 57.9, density: 0.41 },
  'vanilla extract': { cal: 288, p: 0, f: 0, c: 13, density: 0.88 },
  'baking powder': { cal: 53, p: 0, f: 0, c: 28, density: 0.9 },
  'baking soda': ZERO,
  "box devil's food cake mix": {
    cal: 1600,
    p: 16,
    f: 24,
    c: 320,
    piece: 432,
    lowConfidence: true,
  }, // per box, via piece grams
  'box instant chocolate pudding mix': {
    cal: 400,
    p: 0,
    f: 0,
    c: 100,
    piece: 110,
    lowConfidence: true,
  },
  'chocolate icing': { cal: 397, p: 1, f: 17, c: 63, lowConfidence: true }, // canned frosting per 100g
  'espresso powder or 1/2 tsp ground coffee': ZERO,

  // ---- Broths, sauces, condiments ----------------------------------------
  'kirkland chicken bone broth': { cal: 18.75, p: 4.6, f: 0, c: 0, density: 1 },
  'chicken bouillon paste': {
    cal: 250,
    p: 8,
    f: 8,
    c: 33,
    density: 1.1,
    lowConfidence: true,
  },
  'soy sauce': { cal: 53, p: 8, f: 0, c: 5, density: 1.15 },
  'light soy sauce': { cal: 53, p: 8, f: 0, c: 5, density: 1.15 },
  'dark soy sauce': { cal: 60, p: 8, f: 0, c: 8, density: 1.2 },
  'oyster sauce': { cal: 51, p: 1.4, f: 0, c: 11, density: 1.25 },
  'worcestershire sauce': { cal: 78, p: 0, f: 0, c: 19, density: 1.1 },
  'hot sauce': { cal: 11, p: 0.5, f: 0.4, c: 1.8, density: 1 },
  'white vinegar': { cal: 18, p: 0, f: 0, c: 0, density: 1 },
  'chinese black vinegar': {
    cal: 50,
    p: 0.5,
    f: 0,
    c: 12,
    density: 1.1,
    lowConfidence: true,
  },
  'shaoxing wine': { cal: 100, p: 0.5, f: 0, c: 5, density: 1, lowConfidence: true },
  doubanjiang: { cal: 130, p: 6, f: 5, c: 15, lowConfidence: true },
  'marinara sauce': { cal: 72, p: 1.6, f: 4.8, c: 5.6 }, // Rao's-style
  'jar marinara sauce': { cal: 72, p: 1.6, f: 4.8, c: 5.6, piece: 680 }, // 24oz jar
  'marinara sauce for dipping': { cal: 72, p: 1.6, f: 4.8, c: 5.6 },
  'can red enchilada sauce': { cal: 42, p: 1, f: 2, c: 6, lowConfidence: true },
  'basil pesto sauce': { cal: 460, p: 5, f: 46, c: 6, lowConfidence: true },
  'sofrito sauce': { cal: 90, p: 1.5, f: 6, c: 8, lowConfidence: true },
  'dijon mustard': { cal: 66, p: 4, f: 4, c: 6, density: 1.05 },
  "tony chachere's instant roux mix": {
    cal: 360,
    p: 9,
    f: 1,
    c: 76,
    density: 0.55,
    lowConfidence: true,
  },
  'powdered roux mix': {
    cal: 360,
    p: 9,
    f: 1,
    c: 76,
    density: 0.55,
    lowConfidence: true,
  },
  'lemon juice': { cal: 22, p: 0.4, f: 0.2, c: 6.9, density: 1 },

  // ---- Tomatoes -----------------------------------------------------------
  tomato: { cal: 18, p: 0.9, f: 0.2, c: 3.9 },
  'tomato paste': { cal: 82, p: 4.3, f: 0.5, c: 19, density: 1.1 },
  'crushed tomato': { cal: 32, p: 1.6, f: 0.3, c: 7 },
  'canned tomato': { cal: 19, p: 0.9, f: 0.1, c: 4.3 },
  '6-in-1 ground tomato': { cal: 27, p: 1.5, f: 0, c: 5 },

  // ---- Beans & legumes ----------------------------------------------------
  'can no-salt-added black bean': {
    cal: 57,
    p: 3.5,
    f: 0.2,
    c: 9.6,
    lowConfidence: true,
  }, // per 100g as-canned
  'kidney bean': { cal: 112, p: 7, f: 0.4, c: 19, piece: 255 }, // drained; piece = drained 15oz can
  chickpea: { cal: 139, p: 7.5, f: 2.4, c: 21, piece: 250 }, // drained; piece = drained can
  'chili bean': { cal: 92, p: 4.6, f: 0.8, c: 16, piece: 454, lowConfidence: true },
  "bush's chili magic white chili starter": {
    cal: 46,
    p: 2.4,
    f: 0.4,
    c: 8.5,
    piece: 425,
    lowConfidence: true,
  },
  'dried pinto bean': { cal: 347, p: 21, f: 1, c: 63 },

  // ---- Produce ------------------------------------------------------------
  onion: { cal: 40, p: 1.1, f: 0.1, c: 9.3, piece: 150 },
  'green onion': { cal: 32, p: 1.8, f: 0.2, c: 7.3, piece: 15 },
  scallion: { cal: 32, p: 1.8, f: 0.2, c: 7.3 },
  'garlic paste': { cal: 149, p: 6.4, f: 0.5, c: 33, density: 1.1 },
  'ginger paste': { cal: 80, p: 1.8, f: 0.8, c: 18, density: 1.1 },
  carrot: { cal: 41, p: 0.9, f: 0.2, c: 9.6 },
  celery: { cal: 14, p: 0.7, f: 0.2, c: 3 },
  'baby carrot': { cal: 41, p: 0.9, f: 0.2, c: 9.6 },
  spinach: { cal: 23, p: 2.9, f: 0.4, c: 3.6, piece: 283, density: 0.13 }, // piece = 10oz bag; cup ~30g
  'chopped broccoli floret': { cal: 34, p: 2.8, f: 0.4, c: 7, density: 0.37 }, // cup ~88g
  zucchini: { cal: 17, p: 1.2, f: 0.3, c: 3.1, piece: 200 },
  'medium zucchini': { cal: 17, p: 1.2, f: 0.3, c: 3.1, piece: 200 },
  'medium sweet potato': { cal: 86, p: 1.6, f: 0.1, c: 20, piece: 130 },
  'poblano pepper': { cal: 20, p: 1, f: 0.2, c: 4.6, piece: 100, lowConfidence: true },
  'serrano pepper': { cal: 32, p: 1.7, f: 0.4, c: 6.7, piece: 6 },
  'small serrano chile': { cal: 32, p: 1.7, f: 0.4, c: 6.7, piece: 6 },
  jalapeño: { cal: 29, p: 0.9, f: 0.4, c: 6.5, piece: 14 },
  'crimini mushroom': { cal: 22, p: 2.5, f: 0.1, c: 4.3, piece: 227 }, // piece = 8oz box
  'dried shiitake mushroom': { cal: 296, p: 9.6, f: 1, c: 75 },
  'dried red chile': { cal: 324, p: 12, f: 6, c: 70, piece: 2 },
  lemon: { cal: 29, p: 1.1, f: 0.3, c: 9.3, piece: 58 },
  banana: { cal: 89, p: 1.1, f: 0.3, c: 23, piece: 118 },
  'ripe banana': { cal: 89, p: 1.1, f: 0.3, c: 23, piece: 118 },
  'small apples or 3 large': { cal: 52, p: 0.3, f: 0.2, c: 14, piece: 150 },
  'fresh blackberry': { cal: 43, p: 1.4, f: 0.5, c: 10, density: 0.6 },
  'frozen wild blueberry': { cal: 57, p: 0.7, f: 0.3, c: 14, density: 0.65 },
  'blueberry preserve': { cal: 250, p: 0, f: 0, c: 62, density: 1.35 },
  'medjool date': { cal: 277, p: 1.8, f: 0.2, c: 75 },
  'frozen date paste cube': { cal: 277, p: 1.8, f: 0.2, c: 75, piece: 30 }, // ~2 TBSP cube
  applesauce: { cal: 42, p: 0.1, f: 0.1, c: 11, piece: 90 }, // piece = 90g pouch
  'unsweetened applesauce': { cal: 42, p: 0.1, f: 0.1, c: 11, piece: 90 },
  cilantro: { cal: 23, p: 2.1, f: 0.5, c: 3.7, density: 0.1 },
  basil: { cal: 23, p: 3.2, f: 0.6, c: 2.7 },
  'basil leave': { cal: 23, p: 3.2, f: 0.6, c: 2.7, piece: 0.5, density: 0.1 },

  // ---- Nuts & seeds -------------------------------------------------------
  cashew: { cal: 553, p: 18, f: 44, c: 30 },
  'chopped pecan': { cal: 691, p: 9, f: 72, c: 14, density: 0.45 },
  'roasted peanut': { cal: 587, p: 24, f: 50, c: 21 },
  'sliced almond': { cal: 579, p: 21, f: 50, c: 22, density: 0.38 },
  'chia seed': { cal: 486, p: 17, f: 31, c: 42, density: 0.7 },
  'flax seed': { cal: 534, p: 18, f: 42, c: 29, density: 0.6 },

  // ---- Protein powders ----------------------------------------------------
  'vanilla whey protein': {
    cal: 400,
    p: 80,
    f: 5,
    c: 10,
    piece: 30,
    lowConfidence: true,
  }, // piece = scoop
  'unflavored whey protein': { cal: 380, p: 85, f: 3, c: 4, lowConfidence: true },
  // pea protein — label: per ~28g scoop 100cal, 20P, 2F, 0.5C
  'truvani unflavored protein powder': { cal: 357, p: 71, f: 7, c: 2, piece: 28 },

  // ---- Spices & seasonings (meaningful quantities only) -------------------
  'sea salt': ZERO,
  msg: ZERO,
  'sodium citrate': ZERO,
  'xanthan gum': ZERO, // sub-gram thickener; negligible macros
  'black pepper': { cal: 251, p: 10, f: 3.3, c: 64, density: 0.48 },
  'white pepper': { cal: 296, p: 10, f: 2.1, c: 69, density: 0.48 },
  'szechuan peppercorn': { cal: 280, p: 9, f: 8, c: 60, lowConfidence: true },
  'cayenne pepper': { cal: 318, p: 12, f: 17, c: 57, density: 0.42 },
  'red pepper flake': { cal: 318, p: 12, f: 17, c: 57, density: 0.36, piece: 0.5 },
  'chili flake': { cal: 318, p: 12, f: 17, c: 57, density: 0.36 },
  'gochugaru chile powder': { cal: 280, p: 12, f: 10, c: 50, lowConfidence: true },
  'chili powder': { cal: 282, p: 13.5, f: 14, c: 50, density: 0.42 },
  'kashmiri chili powder': { cal: 282, p: 13.5, f: 14, c: 50, density: 0.42 },
  'smokey chipotle powder or bbq spice': {
    cal: 280,
    p: 12,
    f: 10,
    c: 55,
    density: 0.45,
    lowConfidence: true,
  },
  paprika: { cal: 282, p: 14, f: 13, c: 54, density: 0.46 },
  cumin: { cal: 375, p: 18, f: 22, c: 44, density: 0.5 },
  'cumin seed': { cal: 375, p: 18, f: 22, c: 44, density: 0.5 },
  'ground cumin': { cal: 375, p: 18, f: 22, c: 44, density: 0.5 },
  'ground coriander': { cal: 298, p: 12, f: 18, c: 55, density: 0.4 },
  'coriander powder': { cal: 298, p: 12, f: 18, c: 55, density: 0.4 },
  'garam masala': { cal: 320, p: 12, f: 12, c: 50, density: 0.45 },
  'tunisian spice blend': {
    cal: 320,
    p: 12,
    f: 12,
    c: 50,
    density: 0.45,
    lowConfidence: true,
  },
  'cajun seasoning': { cal: 260, p: 8, f: 5, c: 50, density: 0.55, lowConfidence: true },
  'italian seasoning': { cal: 265, p: 9, f: 7, c: 55, density: 0.25 },
  'chili seasoning': {
    cal: 282,
    p: 13.5,
    f: 14,
    c: 50,
    density: 0.42,
    lowConfidence: true,
  },
  'taco seasoning': { cal: 270, p: 5, f: 3, c: 55, piece: 37, lowConfidence: true },
  sazon: { cal: 0, p: 0, f: 0, c: 0, piece: 1.4 },
  'deep brand ready-to-cook biryani spice packet': {
    cal: 350,
    p: 10,
    f: 12,
    c: 50,
    piece: 15,
    lowConfidence: true,
  },
  'garlic powder': { cal: 331, p: 16.5, f: 0.7, c: 73, density: 0.55 },
  'onion powder': { cal: 341, p: 10, f: 1, c: 79, density: 0.48 },
  cinnamon: { cal: 247, p: 4, f: 1.2, c: 81, density: 0.53 },
  'cinnamon stick': { cal: 247, p: 4, f: 1.2, c: 81, piece: 4 },
  'ground cardamom': { cal: 311, p: 11, f: 7, c: 68, density: 0.4 },
  'cardamom seed': { cal: 311, p: 11, f: 7, c: 68 },
  nutmeg: { cal: 525, p: 6, f: 36, c: 49, density: 0.5 },
  sage: { cal: 315, p: 11, f: 13, c: 61, density: 0.3 },
  rosemary: { cal: 331, p: 5, f: 15, c: 64, density: 0.3 },
  'dried oregano': { cal: 265, p: 9, f: 4, c: 69, density: 0.3 },
  'crushed oregano leave': { cal: 265, p: 9, f: 4, c: 69, density: 0.3 },
  'dried basil': { cal: 233, p: 23, f: 4, c: 48, density: 0.25 },
  'dry mustard': { cal: 508, p: 26, f: 36, c: 28, density: 0.5 },
  'chinese five-spice powder': { cal: 347, p: 13, f: 9, c: 67, density: 0.5 },
  'kasoori methi': { cal: 323, p: 23, f: 6, c: 58, density: 0.2 },
  'whole clove': { cal: 274, p: 6, f: 13, c: 66, density: 0.45 },
  'saffron strand': { cal: 310, p: 11, f: 6, c: 65 },
  'small bay leaf': { cal: 313, p: 8, f: 8, c: 75, piece: 0.2 },
  'assam tea': ZERO,

  // ---- Liquids ------------------------------------------------------------
  water: ZERO,
  'cold water': ZERO,
  'warm water': ZERO,
};

/**
 * Names intentionally treated as zero-calorie/garnish in the audit when
 * they appear as unparsed pass-through lines ("Salt to taste").
 */
export const PASSTHROUGH_OK =
  /to taste|for serving|for garnish|^pinch|^sea salt|^black pepper|^olive oil for|^cilantro|^fried onion|^fresh mint|^homemade crouton/i;
