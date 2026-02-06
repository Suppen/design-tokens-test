import fs from 'fs';

const genLightHI = JSON.parse(fs.readFileSync('./design-tokens/primitives/modes/color-scheme/light/HI.json', 'utf8')).HI;
const genDarkHI = JSON.parse(fs.readFileSync('./design-tokens/primitives/modes/color-scheme/dark/HI.json', 'utf8')).HI;
const genLightM = JSON.parse(fs.readFileSync('./design-tokens/primitives/modes/color-scheme/light/Mareano.json', 'utf8')).Mareano;
const genDarkM = JSON.parse(fs.readFileSync('./design-tokens/primitives/modes/color-scheme/dark/Mareano.json', 'utf8')).Mareano;

const existLight = JSON.parse(fs.readFileSync('./design-tokens-existing/Color scheme (test)/Light.json', 'utf8'));
const existDark = JSON.parse(fs.readFileSync('./design-tokens-existing/Color scheme (test)/Dark.json', 'utf8'));

const posToSemantic = {
	'1': 'background-default', '2': 'background-tinted', '3': 'surface-default', '4': 'surface-tinted',
	'5': 'surface-hover', '6': 'surface-active', '7': 'border-subtle', '8': 'border-default',
	'9': 'border-strong', '10': 'text-subtle', '11': 'text-default', '12': 'base-default',
	'13': 'base-hover', '14': 'base-active', '15': 'base-contrast-subtle', '16': 'base-contrast-default'
};

function getSrcColors(data, path) {
	const parts = path.split('.');
	let obj = data;
	for (const p of parts) { obj = obj?.[p]; }
	return obj;
}

function buildOverrides(genLight, genDark, srcLight, srcDark, colorMapping) {
	const overrides = {};
	for (const [genKey, srcPath] of Object.entries(colorMapping)) {
		const srcL = getSrcColors(srcLight, srcPath);
		const srcD = getSrcColors(srcDark, srcPath);
		const gL = genLight[genKey];
		const gD = genDark[genKey];
		if (!srcL || !srcD || !gL || !gD) {
			console.error('MISSING:', genKey, srcPath);
			continue;
		}
		for (let i = 1; i <= 16; i++) {
			const gl = gL[String(i)]?.['$value']?.toLowerCase();
			const gd = gD[String(i)]?.['$value']?.toLowerCase();
			const sl = srcL[String(i)]?.['$value']?.toLowerCase();
			const sd = srcD[String(i)]?.['$value']?.toLowerCase();
			if (gl !== sl || gd !== sd) {
				if (!overrides[genKey]) overrides[genKey] = {};
				const sem = posToSemantic[String(i)];
				overrides[genKey][sem] = {};
				if (gl !== sl) overrides[genKey][sem].light = srcL[String(i)]['$value'];
				if (gd !== sd) overrides[genKey][sem].dark = srcD[String(i)]['$value'];
			}
		}
	}
	return overrides;
}

const hiMapping = {
	'accent': 'HI.primary',
	'brand1': 'HI.secondary',
	'brand2': 'HI.tertiary',
	'brand3': 'HI.brand3',
	'neutral': 'HI.neutral',
	'info': 'globe.info',
	'success': 'globe.success',
	'warning': 'globe.warning',
	'danger': 'globe.erroe',
};

const mMapping = {
	'accent': 'External.Mareano primary',
	'brand1': 'External.Mareano secondary',
	'brand2': 'External.Mareano teriary',
	'brand3': 'External.brand3',
	'neutral': 'External.neutral',
	'info': 'globe.info',
	'success': 'globe.success',
	'warning': 'globe.warning',
	'danger': 'globe.erroe',
};

const hiOverrides = buildOverrides(genLightHI, genDarkHI, existLight, existDark, hiMapping);
const mOverrides = buildOverrides(genLightM, genDarkM, existLight, existDark, mMapping);

const config = {
	'$schema': 'node_modules/@digdir/designsystemet/dist/config.schema.json',
	outDir: './design-tokens',
	themes: {
		HI: {
			colors: {
				main: { accent: '#003366' },
				support: { brand1: '#33cccc', brand2: '#9e0099', brand3: '#1e98f5' },
				neutral: '#000000cc'
			},
			overrides: {
				severity: { info: '#03a9f4', success: '#7cb342', warning: '#fb8c00', danger: '#f44336' },
				colors: hiOverrides
			},
			borderRadius: 4
		},
		Mareano: {
			colors: {
				main: { accent: '#bed45d' },
				support: { brand1: '#084d5c', brand2: '#30b0d5', brand3: '#eadbc8' },
				neutral: '#000000cc'
			},
			overrides: {
				severity: { info: '#03a9f4', success: '#7cb342', warning: '#fb8c00', danger: '#f44336' },
				colors: mOverrides
			},
			borderRadius: 9999
		}
	}
};

fs.writeFileSync('./designsystemet-existing.config.json', JSON.stringify(config, null, 2) + '\n');

// Print summary
console.log('Config written to designsystemet-existing.config.json');
console.log('\nHI overrides:');
for (const [k, v] of Object.entries(hiOverrides)) {
	console.log(`  ${k}: ${Object.keys(v).length} tokens`);
}
console.log('\nMareano overrides:');
for (const [k, v] of Object.entries(mOverrides)) {
	console.log(`  ${k}: ${Object.keys(v).length} tokens`);
}
