import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const DTE = 'design-tokens-existing';
const DT = 'design-tokens';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

// ── Helpers ──────────────────────────────────────────────────────────

/** Build a 16-shade color token object */
function colorShades(source) {
  const out = {};
  for (let i = 1; i <= 16; i++) {
    out[String(i)] = source[String(i)];
  }
  return out;
}

/** Build a semantic color block referencing `{prefix.N}` */
function semanticBlock(prefix) {
  const roles = [
    ['background-default', 1],
    ['background-tinted', 2],
    ['surface-default', 3],
    ['surface-tinted', 4],
    ['surface-hover', 5],
    ['surface-active', 6],
    ['border-subtle', 7],
    ['border-default', 8],
    ['border-strong', 9],
    ['text-subtle', 10],
    ['text-default', 11],
    ['base-default', 12],
    ['base-hover', 13],
    ['base-active', 14],
    ['base-contrast-subtle', 15],
    ['base-contrast-default', 16],
  ];
  const out = {};
  for (const [name, num] of roles) {
    out[name] = { $type: 'color', $value: `{${prefix}.${num}}` };
  }
  return out;
}

/** Build a support/main mode block referencing semantic names */
function modeBlock(outerKey, sourceColor) {
  const roles = [
    'background-default', 'background-tinted',
    'surface-default', 'surface-tinted', 'surface-hover', 'surface-active',
    'border-subtle', 'border-default', 'border-strong',
    'text-subtle', 'text-default',
    'base-default', 'base-hover', 'base-active',
    'base-contrast-subtle', 'base-contrast-default',
  ];
  const out = {};
  for (const role of roles) {
    out[role] = { $type: 'color', $value: `{color.${sourceColor}.${role}}` };
  }
  return { color: { [outerKey]: out } };
}

/** Build a themes/X.json color alias block referencing {theme.colorName.N} */
function themeColorAlias(dtName) {
  const out = {};
  for (let i = 1; i <= 16; i++) {
    out[String(i)] = { $type: 'color', $value: `{theme.${dtName}.${i}}` };
  }
  return out;
}

// ── Read source data ─────────────────────────────────────────────────

const dteLight = readJson(join(DTE, 'Color scheme (test)/Light.json'));
const dteDark = readJson(join(DTE, 'Color scheme (test)/Dark.json'));
const dteThemeHI = readJson(join(DTE, 'themes/HI.json'));
const dteThemeMareano = readJson(join(DTE, 'themes/Mareano.json'));

// ── Color name mapping per theme ─────────────────────────────────────
// DTE source key → DT target name
const hiColorMap = {
  accent:  dteLight.HI.primary,
  brand1:  dteLight.HI.secondary,
  brand2:  dteLight.HI.tertiary,
  brand3:  dteLight.HI.brand3,
  neutral: dteLight.HI.neutral,
};
const hiColorMapDark = {
  accent:  dteDark.HI.primary,
  brand1:  dteDark.HI.secondary,
  brand2:  dteDark.HI.tertiary,
  brand3:  dteDark.HI.brand3,
  neutral: dteDark.HI.neutral,
};

const mareanoColorMap = {
  accent:  dteLight.External['Mareano primary'],
  brand1:  dteLight.External['Mareano secondary'],
  brand2:  dteLight.External['Mareano teriary'],
  brand3:  dteLight.External.brand3,
  neutral: dteLight.External.neutral,
};
const mareanoColorMapDark = {
  accent:  dteDark.External['Mareano primary'],
  brand1:  dteDark.External['Mareano secondary'],
  brand2:  dteDark.External['Mareano teriary'],
  brand3:  dteDark.External.brand3,
  neutral: dteDark.External.neutral,
};

// Shared globe colors (same for all themes)
const globeMapLight = {
  info:    dteLight.globe.info,
  success: dteLight.globe.success,
  warning: dteLight.globe.warning,
  danger:  dteLight.globe.erroe,  // typo in source
};
const globeMapDark = {
  info:    dteDark.globe.info,
  success: dteDark.globe.success,
  warning: dteDark.globe.warning,
  danger:  dteDark.globe.erroe,
};

// ── 1. Generate color-scheme files ───────────────────────────────────

function buildColorScheme(themeColors, globeColors, purpleSource) {
  const theme = {};

  // Theme-specific colors
  for (const [name, source] of Object.entries(themeColors)) {
    theme[name] = colorShades(source);
  }

  // Shared global colors
  for (const [name, source] of Object.entries(globeColors)) {
    theme[name] = colorShades(source);
  }

  // Link visited color (from globe.purple.12)
  theme.link = {
    visited: { $type: 'color', $value: purpleSource['12'].$value },
  };

  // Focus colors derived from neutral
  theme.focus = {
    inner: { $type: 'color', $value: themeColors.neutral['1'].$value },
    outer: { $type: 'color', $value: themeColors.neutral['11'].$value },
  };

  return { theme };
}

// HI light/dark
const hiLight = buildColorScheme(hiColorMap, globeMapLight, dteLight.globe.purple);
const hiDark = buildColorScheme(hiColorMapDark, globeMapDark, dteDark.globe.purple);

// Mareano light/dark
const mareanoLight = buildColorScheme(mareanoColorMap, globeMapLight, dteLight.globe.purple);
const mareanoDark = buildColorScheme(mareanoColorMapDark, globeMapDark, dteDark.globe.purple);

// Write color scheme files
for (const [name, light, dark] of [
  ['HI', hiLight, hiDark],
  ['Mareano', mareanoLight, mareanoDark],
]) {
  mkdirSync(join(DT, `primitives/modes/color-scheme/light`), { recursive: true });
  mkdirSync(join(DT, `primitives/modes/color-scheme/dark`), { recursive: true });
  writeJson(join(DT, `primitives/modes/color-scheme/light/${name}.json`), light);
  writeJson(join(DT, `primitives/modes/color-scheme/dark/${name}.json`), dark);
}

// ── 2. Generate theme files ──────────────────────────────────────────

const themeColors = ['accent', 'neutral', 'brand1', 'brand2', 'brand3'];
const globalColors = ['info', 'success', 'warning', 'danger'];

function buildThemeFile(dteTheme) {
  const color = {};

  // Theme-specific colors: color.X.N → {theme.X.N}
  for (const dtName of themeColors) {
    color[dtName] = themeColorAlias(dtName);
  }

  // Global colors: color.X.N → {theme.X.N}
  for (const dtName of globalColors) {
    color[dtName] = themeColorAlias(dtName);
  }

  // Link + focus
  color.link = {
    visited: { $type: 'color', $value: '{theme.link.visited}' },
  };
  color.focus = {
    'inner-color': { $type: 'color', $value: '{theme.focus.inner}' },
    'outer-color': { $type: 'color', $value: '{theme.focus.outer}' },
  };

  const result = { color };

  // Non-color tokens from the DTE theme file
  if (dteTheme['font-family']) {
    result['font-family'] = dteTheme['font-family'];
  }
  if (dteTheme['font-weight']) {
    result['font-weight'] = dteTheme['font-weight'];
  }
  if (dteTheme['border-radius']) {
    result['border-radius'] = dteTheme['border-radius'];
  }

  return result;
}

writeJson(join(DT, 'themes/HI.json'), buildThemeFile(dteThemeHI));
writeJson(join(DT, 'themes/Mareano.json'), buildThemeFile(dteThemeMareano));

// ── 3. Generate semantic/color.json ──────────────────────────────────

function buildSemanticColor() {
  const color = {};

  // All color families get semantic blocks
  for (const name of [...themeColors, ...globalColors]) {
    color[name] = semanticBlock(`color.${name}`);
  }

  // Focus + link
  color.focus = {
    inner: { $type: 'color', $value: '{color.focus.inner-color}' },
    outer: { $type: 'color', $value: '{color.focus.outer-color}' },
  };

  return {
    color,
    link: {
      color: {
        visited: { $type: 'color', $value: '{color.link.visited}' },
      },
    },
  };
}

writeJson(join(DT, 'semantic/color.json'), buildSemanticColor());

// ── 4. Generate semantic mode files ──────────────────────────────────

// Main color: accent
writeJson(
  join(DT, 'semantic/modes/main-color/accent.json'),
  modeBlock('main', 'accent'),
);

// Support colors: brand1, brand2, brand3
for (const brand of ['brand1', 'brand2', 'brand3']) {
  mkdirSync(join(DT, 'semantic/modes/support-color'), { recursive: true });
  writeJson(
    join(DT, `semantic/modes/support-color/${brand}.json`),
    modeBlock('support', brand),
  );
}

// ── 5. Update $metadata.json ─────────────────────────────────────────

const metadata = readJson(join(DT, '$metadata.json'));
metadata.tokenSetOrder = [
  'primitives/globals',
  'primitives/modes/size/small',
  'primitives/modes/size/medium',
  'primitives/modes/size/large',
  'primitives/modes/size/global',
  'primitives/modes/typography/size/small',
  'primitives/modes/typography/size/medium',
  'primitives/modes/typography/size/large',
  'primitives/modes/typography/primary/theme',
  'primitives/modes/typography/secondary/theme',
  'primitives/modes/color-scheme/light/HI',
  'primitives/modes/color-scheme/light/Mareano',
  'primitives/modes/color-scheme/dark/HI',
  'primitives/modes/color-scheme/dark/Mareano',
  'themes/HI',
  'themes/Mareano',
  'semantic/color',
  'semantic/modes/main-color/accent',
  'semantic/modes/support-color/brand1',
  'semantic/modes/support-color/brand2',
  'semantic/modes/support-color/brand3',
  'semantic/style',
];
writeJson(join(DT, '$metadata.json'), metadata);

// ── 6. Update $themes.json ───────────────────────────────────────────

const themes = readJson(join(DT, '$themes.json'));

// Remove the old single "theme" entry and old color-scheme entries
const filteredThemes = themes.filter(
  (t) =>
    t.group !== 'Theme' &&
    t.group !== 'Color scheme' &&
    t.group !== 'Main color' &&
    t.group !== 'Support color',
);

// Add new Color scheme modes
filteredThemes.push(
  {
    id: crypto.randomUUID().replace(/-/g, ''),
    name: 'Light/HI',
    selectedTokenSets: {
      'primitives/modes/color-scheme/light/HI': 'enabled',
    },
    group: 'Color scheme',
  },
  {
    id: crypto.randomUUID().replace(/-/g, ''),
    name: 'Dark/HI',
    selectedTokenSets: {
      'primitives/modes/color-scheme/dark/HI': 'enabled',
    },
    group: 'Color scheme',
  },
  {
    id: crypto.randomUUID().replace(/-/g, ''),
    name: 'Light/Mareano',
    selectedTokenSets: {
      'primitives/modes/color-scheme/light/Mareano': 'enabled',
    },
    group: 'Color scheme',
  },
  {
    id: crypto.randomUUID().replace(/-/g, ''),
    name: 'Dark/Mareano',
    selectedTokenSets: {
      'primitives/modes/color-scheme/dark/Mareano': 'enabled',
    },
    group: 'Color scheme',
  },
);

// Add Theme modes
filteredThemes.push(
  {
    id: crypto.randomUUID().replace(/-/g, ''),
    name: 'HI',
    selectedTokenSets: {
      'themes/HI': 'enabled',
    },
    group: 'Theme',
  },
  {
    id: crypto.randomUUID().replace(/-/g, ''),
    name: 'Mareano',
    selectedTokenSets: {
      'themes/Mareano': 'enabled',
    },
    group: 'Theme',
  },
);

// Add Semantic mode
filteredThemes.push({
  id: crypto.randomUUID().replace(/-/g, ''),
  name: 'Semantic',
  selectedTokenSets: {
    'semantic/style': 'enabled',
    'semantic/color': 'enabled',
    'primitives/globals': 'source',
  },
  group: 'Semantic',
});

// Add Main color mode
filteredThemes.push({
  id: crypto.randomUUID().replace(/-/g, ''),
  name: 'accent',
  selectedTokenSets: {
    'semantic/modes/main-color/accent': 'enabled',
  },
  group: 'Main color',
});

// Add Support color modes
for (const brand of ['brand1', 'brand2', 'brand3']) {
  filteredThemes.push({
    id: crypto.randomUUID().replace(/-/g, ''),
    name: brand,
    selectedTokenSets: {
      [`semantic/modes/support-color/${brand}`]: 'enabled',
    },
    group: 'Support color',
  });
}

writeJson(join(DT, '$themes.json'), filteredThemes);

// ── Done ─────────────────────────────────────────────────────────────

console.log('Conversion complete. Files written to design-tokens/:');
console.log('  primitives/modes/color-scheme/light/HI.json');
console.log('  primitives/modes/color-scheme/light/Mareano.json');
console.log('  primitives/modes/color-scheme/dark/HI.json');
console.log('  primitives/modes/color-scheme/dark/Mareano.json');
console.log('  themes/HI.json');
console.log('  themes/Mareano.json');
console.log('  semantic/color.json');
console.log('  semantic/modes/main-color/accent.json');
console.log('  semantic/modes/support-color/brand1.json');
console.log('  semantic/modes/support-color/brand2.json');
console.log('  semantic/modes/support-color/brand3.json');
console.log('  $metadata.json');
console.log('  $themes.json');
console.log('');
console.log('Color mapping applied:');
console.log('  primary   → accent');
console.log('  secondary → brand1');
console.log('  tertiary  → brand2');
console.log('  brand3    → brand3 (new)');
console.log('  neutral   → neutral');
console.log('  globe.erroe → danger (typo fixed)');
console.log('  globe.purple.12 → link.visited');
