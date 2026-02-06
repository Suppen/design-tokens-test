import { readFileSync, writeFileSync } from 'node:fs';

const INPUT = 'design-tokens-build/theme.css';
const OUTPUT = 'design-tokens-build/tailwind-theme.css';

const css = readFileSync(INPUT, 'utf-8');

// Extract all --ds-* variable declarations (name only, deduplicated)
const varNames = new Set();
for (const match of css.matchAll(/--ds-([\w-]+)\s*:/g)) {
  varNames.add(match[1]);
}

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
    // --ds-color-* -> --color-*
    // --ds-link-color-visited -> --color-link-visited
    let themeName;
    if (name === 'link-color-visited') {
      themeName = '--color-link-visited';
    } else {
      themeName = `--${name}`; // already starts with color-
    }
    categories.colors.entries.push({ themeName, dsVar });
  } else if (name.startsWith('size-')) {
    // --ds-size-N -> --spacing-N
    const suffix = name.replace('size-', '');
    categories.spacing.entries.push({ themeName: `--spacing-${suffix}`, dsVar });
  } else if (name.startsWith('font-size-')) {
    const suffix = name.replace('font-size-', '');
    categories.fontSize.entries.push({ themeName: `--font-size-${suffix}`, dsVar });
  } else if (name.startsWith('shadow-')) {
    categories.shadows.entries.push({ themeName: `--${name}`, dsVar });
  } else if (name.startsWith('border-radius-')) {
    const suffix = name.replace('border-radius-', '');
    categories.borderRadius.entries.push({ themeName: `--radius-${suffix}`, dsVar });
  } else if (name.startsWith('font-weight-')) {
    categories.fontWeight.entries.push({ themeName: `--${name}`, dsVar });
  } else if (name === 'font-family') {
    categories.fontFamily.entries.push({ themeName: '--font-family-default', dsVar });
  } else if (name.startsWith('line-height-')) {
    categories.lineHeight.entries.push({ themeName: `--${name}`, dsVar });
  } else if (name.startsWith('letter-spacing-')) {
    categories.letterSpacing.entries.push({ themeName: `--${name}`, dsVar });
  } else if (name.startsWith('border-width-')) {
    categories.borderWidth.entries.push({ themeName: `--${name}`, dsVar });
  } else if (name.startsWith('opacity-')) {
    categories.opacity.entries.push({ themeName: `--${name}`, dsVar });
  }
}

// Build output
const lines = ['/* Generated from design-tokens-build/theme.css */', '', '@theme {'];

for (const cat of Object.values(categories)) {
  if (cat.entries.length === 0) continue;
  lines.push(`  /* ${cat.comment} */`);
  for (const { themeName, dsVar } of cat.entries) {
    lines.push(`  ${themeName}: var(${dsVar});`);
  }
  lines.push('');
}

// Remove trailing blank line inside the block
if (lines[lines.length - 1] === '') lines.pop();

lines.push('}', '');

writeFileSync(OUTPUT, lines.join('\n'), 'utf-8');
console.log(`Wrote ${OUTPUT}`);
