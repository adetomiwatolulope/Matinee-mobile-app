/**
 * ============================================================================
 * Matinee Design Tokens → CSS Variables Converter
 * ============================================================================
 *
 * This script reads the Figma-exported design tokens JSON file
 * (`design-tokens.tokens (1).json`) and converts it into a well-structured,
 * fully documented CSS custom-properties stylesheet.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * COLOUR SYSTEM ARCHITECTURE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The design system uses a two-tier colour architecture inspired by
 * Material Design 3:
 *
 *   1. PRIMITIVE COLOURS (Foundation Layer)
 *      ────────────────────────────────────
 *      These are the raw tonal palettes generated from the key/seed colours.
 *      Each palette (primary, secondary, tertiary, neutral, neutral-variant,
 *      error, info, warning, success) contains tonal steps from 0 (darkest)
 *      to 100 (lightest): 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 98,
 *      99, 100.
 *
 *      ⚠  PRIMITIVES ARE NOT MEANT TO BE APPLIED DIRECTLY IN THE UI.
 *         They exist purely as the source palette from which colour roles
 *         are derived. Referencing a primitive directly in a component
 *         bypasses the semantic meaning layer and will break theme
 *         adaptability (e.g. dark mode).
 *
 *      CSS namespace:  --primitive-{palette}-{step}
 *      Example:        --primitive-primary-40
 *
 *   2. COLOUR ROLES (Semantic / Application Layer)
 *      ────────────────────────────────────────────
 *      These are the colours you SHOULD use in the UI. Each role maps to
 *      a specific primitive tonal value, giving it semantic meaning:
 *
 *        • "primary"              → the main brand colour
 *        • "on primary"           → text/icons shown ON a primary surface
 *        • "primary container"    → a tinted container background
 *        • "on primary container" → text/icons ON that container
 *        • "surface"              → the default page/card background
 *        • "on surface"           → text/icons on the default background
 *        • "error", "warning",
 *          "success", "info"      → semantic status colours
 *        … and so on for secondary, tertiary, neutral, neutral-variant.
 *
 *      CSS namespace:  --color-{role}
 *      Example:        --color-primary, --color-on-primary,
 *                      --color-surface-container-high
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * OTHER TOKEN CATEGORIES
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   • EFFECTS          → CSS box-shadow variables
 *     Namespace:        --effect-{name}
 *
 *   • SPACING SYSTEM   → A spacing scale (0 → 64 px)
 *     Namespace:        --spacing-{name}
 *
 *   • TYPOGRAPHY       → Font families, sizes, weights, line-heights,
 *                         letter-spacing for display, headline, title,
 *                         body, and label styles at large/medium/small.
 *     Namespace:        --typography-{category}-{size}-{property}
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * USAGE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   node scripts/convert-design-tokens.js
 *
 * The script writes the output to:
 *
 *   design-tokens.css      (in the project root)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TOKEN REFERENCE RESOLUTION
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Colour roles in the source JSON use Figma token references like:
 *
 *   "{primitives.primary colors.primary 90}"
 *
 * This script resolves every reference to its concrete hex value so the
 * output CSS is self-contained and does not depend on CSS variable nesting
 * for the primitive layer. However, both layers are emitted so that:
 *
 *   • Role variables hold resolved hex values (ready to use).
 *   • Primitive variables are available for advanced/debugging use,
 *     but carry a doc comment warning against direct UI use.
 *
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

// ─── File paths ──────────────────────────────────────────────────────────────

const INPUT_FILE = path.resolve(
  __dirname,
  '..',
  'design-tokens.tokens (1).json'
);
const OUTPUT_FILE = path.resolve(__dirname, '..', 'design-tokens.css');

// ─── Read & parse ────────────────────────────────────────────────────────────

let tokens;
try {
  const raw = fs.readFileSync(INPUT_FILE, 'utf-8');
  tokens = JSON.parse(raw);
} catch (err) {
  console.error(`❌  Failed to read/parse "${INPUT_FILE}":\n`, err.message);
  process.exit(1);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Convert an 8-character hex colour (#rrggbbaa) to a standard 6-character
 * hex (#rrggbb) when the alpha channel is fully opaque (ff).
 * This keeps the output cleaner and more familiar.
 *
 * @param {string} hex - e.g. "#012624ff"
 * @returns {string}   - e.g. "#012624"
 */
function normaliseHex(hex) {
  if (!hex || typeof hex !== 'string') return hex;
  // #rrggbbff → #rrggbb (fully opaque)
  if (hex.length === 9 && hex.toLowerCase().endsWith('ff')) {
    return hex.slice(0, 7);
  }
  return hex;
}

/**
 * Slugify a human-readable token name into a valid CSS custom-property
 * fragment.  Spaces → hyphens, lowercase, strip non-alphanumeric.
 *
 * @param {string} name
 * @returns {string}
 */
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// ─── Build a flat lookup of ALL primitive colour values ──────────────────────
// Maps reference paths like "primitives.primary colors.primary 40" → "#05c7bc"

/** @type {Record<string, string>} */
const primitiveLookup = {};

if (tokens.primitives) {
  // Also index "key colors" since some roles reference them directly
  for (const [groupName, group] of Object.entries(tokens.primitives)) {
    if (typeof group !== 'object' || group === null) continue;
    for (const [tokenName, tokenDef] of Object.entries(group)) {
      if (tokenDef && tokenDef.type === 'color' && tokenDef.value) {
        const refPath = `primitives.${groupName}.${tokenName}`;
        primitiveLookup[refPath] = normaliseHex(tokenDef.value);
      }
    }
  }
}

/**
 * Resolve a Figma token reference string to its concrete hex value.
 *
 * References look like:  {primitives.primary colors.primary 90}
 *
 * @param {string} ref
 * @returns {string} resolved hex, or the raw ref if unresolvable
 */
function resolveReference(ref) {
  if (!ref || typeof ref !== 'string') return ref;

  // Strip enclosing braces
  const inner = ref.replace(/^\{/, '').replace(/\}$/, '');

  if (primitiveLookup[inner]) {
    return primitiveLookup[inner];
  }

  // Fallback: return as-is (logged as warning)
  console.warn(`⚠  Could not resolve reference: "${ref}"`);
  return ref;
}

// ─── CSS Generation ─────────────────────────────────────────────────────────

const lines = [];

/**
 * Push a block of lines with a prominent section banner.
 *
 * @param {string} title
 * @param {string} description
 */
function sectionBanner(title, description) {
  lines.push('');
  lines.push(`  /* ${'═'.repeat(68)} */`);
  lines.push(`  /* ${title.toUpperCase()}`);
  lines.push(`  /* ${'-'.repeat(68)}`);
  lines.push(`  /* ${description}`);
  lines.push(`  /* ${'═'.repeat(68)} */`);
  lines.push('');
}

/**
 * Push a smaller sub-section comment.
 *
 * @param {string} title
 */
function subSection(title) {
  lines.push('');
  lines.push(`  /* ── ${title} ${'─'.repeat(Math.max(0, 58 - title.length))} */`);
  lines.push('');
}

// ═══════════════════════════════════════════════════════════════════════════
// File header
// ═══════════════════════════════════════════════════════════════════════════

lines.push(`/**`);
lines.push(` * ============================================================================`);
lines.push(` * Matinee Design System — CSS Custom Properties`);
lines.push(` * ============================================================================`);
lines.push(` *`);
lines.push(` * Auto-generated by scripts/convert-design-tokens.js`);
lines.push(` * Source: design-tokens.tokens (1).json`);
lines.push(` * Generated: ${new Date().toISOString()}`);
lines.push(` *`);
lines.push(` * DO NOT EDIT THIS FILE MANUALLY.`);
lines.push(` * Re-run the conversion script after updating the Figma tokens export.`);
lines.push(` *`);
lines.push(` * ─────────────────────────────────────────────────────────────────────────`);
lines.push(` * COLOUR USAGE GUIDE`);
lines.push(` * ─────────────────────────────────────────────────────────────────────────`);
lines.push(` *`);
lines.push(` *   ✅  USE colour role variables in your UI:`);
lines.push(` *       var(--color-primary)`);
lines.push(` *       var(--color-on-surface)`);
lines.push(` *       var(--color-error-container)`);
lines.push(` *`);
lines.push(` *   ⛔  DO NOT use primitive variables directly in UI components:`);
lines.push(` *       var(--primitive-primary-40)        ← wrong`);
lines.push(` *       var(--primitive-neutral-90)         ← wrong`);
lines.push(` *`);
lines.push(` *   Primitives exist only as the foundational palette.  Colour roles`);
lines.push(` *   map those palette values to semantic purposes (background, text,`);
lines.push(` *   containers, states) so the theme can be swapped or adapted`);
lines.push(` *   (e.g. light → dark) without changing component code.`);
lines.push(` * ============================================================================`);
lines.push(` */`);
lines.push('');
lines.push(':root {');

// ═══════════════════════════════════════════════════════════════════════════
// 1. EFFECTS
// ═══════════════════════════════════════════════════════════════════════════

if (tokens.effect) {
  sectionBanner(
    'Effects / Shadows',
    'Drop-shadow presets. Usage: box-shadow: var(--effect-hard-shadow);'
  );

  for (const [name, def] of Object.entries(tokens.effect)) {
    if (def.type !== 'custom-shadow' || !def.value) continue;
    const v = def.value;
    const varName = `--effect-${slugify(name)}`;
    const cssValue = `${v.offsetX}px ${v.offsetY}px ${v.radius}px ${v.spread}px ${v.color}`;
    lines.push(`  /** ${name} — ${v.shadowType} */`);
    lines.push(`  ${varName}: ${cssValue};`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. PRIMITIVE COLOURS
// ═══════════════════════════════════════════════════════════════════════════

if (tokens.primitives) {
  sectionBanner(
    'Primitive Colours (Foundation Layer)',
    '⚠  DO NOT apply these directly in the UI. Use colour roles instead.'
  );

  // Key colours first
  if (tokens.primitives['key colors']) {
    subSection('Key / Seed Colours');
    lines.push('  /**');
    lines.push('   * Key colours are the seed values from which the tonal palettes');
    lines.push('   * were generated.  They are included here for reference and');
    lines.push('   * debugging only.');
    lines.push('   */');
    for (const [name, def] of Object.entries(tokens.primitives['key colors'])) {
      if (def.type !== 'color') continue;
      const varName = `--primitive-${slugify(name)}`;
      lines.push(`  ${varName}: ${normaliseHex(def.value)};`);
    }
  }

  // Tonal palettes
  const paletteGroups = [
    ['primary colors', 'Primary Tonal Palette'],
    ['secondary colors', 'Secondary Tonal Palette'],
    ['tertiary colors', 'Tertiary Tonal Palette'],
    ['neutral colors', 'Neutral Tonal Palette'],
    ['neutral variant colors', 'Neutral Variant Tonal Palette'],
    ['error colors', 'Error Tonal Palette'],
    ['info colors', 'Info Tonal Palette'],
    ['warning colors', 'Warning Tonal Palette'],
    ['success colors', 'Success Tonal Palette'],
  ];

  for (const [groupKey, groupLabel] of paletteGroups) {
    const group = tokens.primitives[groupKey];
    if (!group) continue;

    subSection(groupLabel);
    lines.push(`  /**`);
    lines.push(`   * Tonal steps: 0 (darkest) → 100 (lightest)`);
    lines.push(`   * These are raw palette values — use colour roles for UI.`);
    lines.push(`   */`);

    for (const [name, def] of Object.entries(group)) {
      if (def.type !== 'color') continue;
      const varName = `--primitive-${slugify(name)}`;
      lines.push(`  ${varName}: ${normaliseHex(def.value)};`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. COLOUR ROLES
// ═══════════════════════════════════════════════════════════════════════════

if (tokens['color roles']) {
  sectionBanner(
    'Colour Roles (Semantic / Application Layer)',
    '✅  USE these variables in your UI components and layouts.'
  );

  // Group the roles logically for better documentation
  const roleGroups = {
    'Primary': ['primary', 'on primary', 'primary container', 'on primary container'],
    'Secondary': ['secondary', 'on secondary', 'secondary container', 'on secondary container'],
    'Tertiary': ['tertiary', 'on tertiary', 'tertiary container', 'on tertiary container'],
    'Neutral': ['neutral', 'on neutral', 'neutral container', 'on neutral container'],
    'Neutral Variant': ['neutral variant', 'on neutral variant', 'neutral variant container', 'on neutral variant container'],
    'Error': ['error', 'on error', 'error container', 'on error container'],
    'Info': ['info', 'on info', 'info container', 'on info container'],
    'Warning': ['warning', 'on warning', 'warning container', 'on warning container'],
    'Success': ['success', 'on success', 'success container', 'on success container'],
    'Surface': [
      'surface', 'on surface',
      'surface varaint', 'on surface varaint',
      'surface container highest', 'surface container high',
      'surface container', 'surface container low', 'surface container lowest',
      'surface container lowest 2',
      'surface tint',
      'inverse surface', 'inverse on surface', 'inverse on surface 2',
    ],
  };

  for (const [groupLabel, roleNames] of Object.entries(roleGroups)) {
    subSection(`${groupLabel} Roles`);

    for (const roleName of roleNames) {
      const def = tokens['color roles'][roleName];
      if (!def) continue;

      const varName = `--color-${slugify(roleName)}`;
      const isRef = typeof def.value === 'string' && def.value.startsWith('{');
      const resolved = isRef ? resolveReference(def.value) : normaliseHex(def.value);
      const source = isRef ? ` /* source: ${def.value} */` : '';

      lines.push(`  ${varName}: ${resolved};${source}`);
    }
  }

  // Catch any roles not covered by the explicit grouping above
  const coveredRoles = new Set(Object.values(roleGroups).flat());
  const uncovered = Object.keys(tokens['color roles']).filter(
    (k) => !coveredRoles.has(k)
  );

  if (uncovered.length > 0) {
    subSection('Other Colour Roles');
    for (const roleName of uncovered) {
      const def = tokens['color roles'][roleName];
      if (!def || def.type !== 'color') continue;

      const varName = `--color-${slugify(roleName)}`;
      const isRef = typeof def.value === 'string' && def.value.startsWith('{');
      const resolved = isRef ? resolveReference(def.value) : normaliseHex(def.value);
      const source = isRef ? ` /* source: ${def.value} */` : '';

      lines.push(`  ${varName}: ${resolved};${source}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. SPACING SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

if (tokens['spacing system']) {
  sectionBanner(
    'Spacing System',
    'A harmonious spacing scale. Usage: padding: var(--spacing-base);'
  );

  lines.push('  /**');
  lines.push('   * Spacing scale (px values):');
  lines.push('   *');

  const spacingEntries = Object.entries(tokens['spacing system']);
  for (const [name, def] of spacingEntries) {
    lines.push(`   *   ${name}: ${def.value}px`);
  }
  lines.push('   */');

  for (const [name, def] of spacingEntries) {
    if (def.type !== 'dimension') continue;
    const varName = `--spacing-${slugify(name)}`;
    lines.push(`  ${varName}: ${def.value}px;`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. TYPOGRAPHY
// ═══════════════════════════════════════════════════════════════════════════

if (tokens.typography) {
  sectionBanner(
    'Typography',
    'Type styles for display, headline, title, body, and label.'
  );

  lines.push('  /**');
  lines.push('   * Font families used in the design system:');
  lines.push('   *   • Lora      — used for Display styles (serif, decorative)');
  lines.push('   *   • DM Sans   — used for Headline, Title, Body, Label (sans-serif)');
  lines.push('   *');
  lines.push('   * Each typography category has large, medium, and small variants.');
  lines.push('   * Properties per variant: font-family, font-size, font-weight,');
  lines.push('   * line-height, letter-spacing, font-style, text-decoration,');
  lines.push('   * text-transform.');
  lines.push('   */');

  for (const [category, sizes] of Object.entries(tokens.typography)) {
    if (typeof sizes !== 'object') continue;

    subSection(`Typography — ${category.charAt(0).toUpperCase() + category.slice(1)}`);

    for (const [size, props] of Object.entries(sizes)) {
      if (typeof props !== 'object') continue;

      const prefix = `--typography-${slugify(category)}-${slugify(size)}`;

      lines.push(`  /** ${category} / ${size} */`);

      if (props.fontFamily) {
        lines.push(`  ${prefix}-font-family: "${props.fontFamily.value}", sans-serif;`);
      }
      if (props.fontSize) {
        lines.push(`  ${prefix}-font-size: ${props.fontSize.value}px;`);
      }
      if (props.fontWeight) {
        lines.push(`  ${prefix}-font-weight: ${props.fontWeight.value};`);
      }
      if (props.lineHeight) {
        lines.push(`  ${prefix}-line-height: ${props.lineHeight.value}px;`);
      }
      if (props.letterSpacing) {
        lines.push(`  ${prefix}-letter-spacing: ${props.letterSpacing.value}px;`);
      }
      if (props.fontStyle) {
        lines.push(`  ${prefix}-font-style: ${props.fontStyle.value};`);
      }
      if (props.textDecoration) {
        lines.push(`  ${prefix}-text-decoration: ${props.textDecoration.value};`);
      }
      if (props.textCase) {
        const cssTransform = props.textCase.value === 'none' ? 'none' : props.textCase.value;
        lines.push(`  ${prefix}-text-transform: ${cssTransform};`);
      }
      lines.push('');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Close :root
// ═══════════════════════════════════════════════════════════════════════════

lines.push('}');
lines.push('');

// ─── Write output ────────────────────────────────────────────────────────────

const css = lines.join('\n');
fs.writeFileSync(OUTPUT_FILE, css, 'utf-8');

const varCount = (css.match(/--[\w-]+:/g) || []).length;
console.log(`✅  Generated ${OUTPUT_FILE}`);
console.log(`    ${varCount} CSS custom properties written.`);
console.log('');
console.log('    Sections:');
console.log('      • Effects / Shadows');
console.log('      • Primitive Colours (foundation — do NOT use in UI)');
console.log('      • Colour Roles (semantic — USE in UI)');
console.log('      • Spacing System');
console.log('      • Typography');

