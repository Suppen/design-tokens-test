import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const BUILD_DIR = 'design-tokens-build';
const OUT_DIR = 'design-tokens-tailwind';
mkdirSync(OUT_DIR, { recursive: true });

const cssFiles = readdirSync(BUILD_DIR)
  .filter((f) => f.endsWith('.css'))
  .map((f) => join(BUILD_DIR, f));

// Skip patterns: internal/computed variables and composite typography tokens
const skipPatterns = [
  /^size-base$/,
  /^size-step$/,
  /^size-unit$/,
  /^size-mode-font-size/,
  /^size--/,
  /^border-radius-base$/,
  /^border-radius-scale$/,
  /^heading-/,
  /^body-/,
  /^body-short-/,
  /^body-long-/,
];

// Also skip the private computed variable
const skipExact = new Set(['_ds-font-size-factor']);

function isSkipped(name) {
  if (skipExact.has(name)) return true;
  return skipPatterns.some((p) => p.test(name));
}

for (const inputFile of cssFiles) {
  const themeName = basename(inputFile, '.css');
  const outputFile = join(OUT_DIR, `${themeName}.css`);
  const css = readFileSync(inputFile, 'utf-8');

  // Extract all --ds-* variable declarations (name only, deduplicated)
  const varNames = new Set();
  for (const match of css.matchAll(/--ds-([\w-]+)\s*:/g)) {
    varNames.add(match[1]);
  }

  // Categorize and map variables
  const categories = {
    colors: { comment: 'Colors', entries: [] },
    spacing: { comment: 'Spacing', entries: [] },
    fontSize: { comment: 'Font Size', entries: [] },
    shadows: { comment: 'Shadows', entries: [] },
    borderRadius: { comment: 'Border Radius', entries: [] },
    fontWeight: { comment: 'Font Weight', entries: [] },
    fontFamily: { comment: 'Font Family', entries: [] },
    lineHeight: { comment: 'Line Height', entries: [] },
    letterSpacing: { comment: 'Letter Spacing', entries: [] },
    borderWidth: { comment: 'Border Width', entries: [] },
    opacity: { comment: 'Opacity', entries: [] },
  };

  for (const name of varNames) {
    if (isSkipped(name)) continue;

    const dsVar = `--ds-${name}`;

    if (name.startsWith('color-') || name === 'link-color-visited') {
      let twName;
      if (name === 'link-color-visited') {
        twName = '--color-link-visited';
      } else {
        twName = `--${name}`; // already starts with color-
      }
      categories.colors.entries.push({ twName, dsVar });
    } else if (name.startsWith('size-')) {
      const suffix = name.replace('size-', '');
      categories.spacing.entries.push({ twName: `--spacing-${suffix}`, dsVar });
    } else if (name.startsWith('font-size-')) {
      const suffix = name.replace('font-size-', '');
      categories.fontSize.entries.push({ twName: `--font-size-${suffix}`, dsVar });
    } else if (name.startsWith('shadow-')) {
      categories.shadows.entries.push({ twName: `--${name}`, dsVar });
    } else if (name.startsWith('border-radius-')) {
      const suffix = name.replace('border-radius-', '');
      categories.borderRadius.entries.push({ twName: `--radius-${suffix}`, dsVar });
    } else if (name.startsWith('font-weight-')) {
      categories.fontWeight.entries.push({ twName: `--${name}`, dsVar });
    } else if (name === 'font-family') {
      categories.fontFamily.entries.push({ twName: '--font-family-default', dsVar });
    } else if (name.startsWith('line-height-')) {
      categories.lineHeight.entries.push({ twName: `--${name}`, dsVar });
    } else if (name.startsWith('letter-spacing-')) {
      categories.letterSpacing.entries.push({ twName: `--${name}`, dsVar });
    } else if (name.startsWith('border-width-')) {
      categories.borderWidth.entries.push({ twName: `--${name}`, dsVar });
    } else if (name.startsWith('opacity-')) {
      categories.opacity.entries.push({ twName: `--${name}`, dsVar });
    }
  }

  // Build output
  const lines = [`/* Generated from ${inputFile} */`, '', '@theme {'];

  for (const cat of Object.values(categories)) {
    if (cat.entries.length === 0) continue;
    lines.push(`  /* ${cat.comment} */`);
    for (const { twName, dsVar } of cat.entries) {
      lines.push(`  ${twName}: var(${dsVar});`);
    }
    lines.push('');
  }

  // Remove trailing blank line inside the block
  if (lines[lines.length - 1] === '') lines.pop();

  lines.push('}', '');

  writeFileSync(outputFile, lines.join('\n'), 'utf-8');
  console.log(`Wrote ${outputFile}`);
}
