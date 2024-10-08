#!/usr/bin/env node
import chokidar from 'chokidar';
import esbuild from 'esbuild';
import { statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { cwd, hrtime } from 'node:process';
import { PowPowConfig } from '../@types/powpow.js';
import handler from 'serve-handler';
import http from 'http';
import { version } from '../package.json';

function printLogo() {
	console.log(`\u{250f}\u{2513}\u{250f}\u{2513}\u{2513}\u{20}\u{250f}\u{250f}\u{2513}\u{250f}\u{2513}\u{2513}\u{20}\u{250f}\u{a}\u{2503}\u{2503}\u{2503}\u{2503}\u{2503}\u{2503}\u{2503}\u{2503}\u{2503}\u{2503}\u{2503}\u{2503}\u{2503}\u{2503}\u{a}\u{2523}\u{251b}\u{2517}\u{251b}\u{2517}\u{253b}\u{251b}\u{2523}\u{251b}\u{2517}\u{251b}\u{2517}\u{253b}\u{251b}\u{a}\u{20}\u{20}\u{20}\u{20}\u{20}\u{20}\u{20}\u{20}v${version}\n`);
}

const defaultTsConfig = `{
	"$schema": "https://json.schemastore.org/tsconfig",
	"extends": "@pstevju/powpow/dist/tsconfig.powpow.json",
	"compilerOptions": {
		"rootDir": "./ts",
		"typeRoots": ["./node_modules/@types", "./ts/@types"]
	}
}`;

const defaultPowPowConfig = `/** @type {import('@pstevju/powpow').PowPowConfig} */
const config = {
	portal: {
		path: './portal',
	},
	typescript: {
		path: './typescript',
		minify: false,
	},
	devServer: {
		enabled: true,
		port: 8080,
	},
};

export default config;
`;

const args = process.argv.slice(2);

const powpowConfigPath = resolve(cwd(), './powpow.config.mjs');
const tsConfigPath = resolve(cwd(), './tsconfig.json');

let config: PowPowConfig;

if (args.includes('--version') || args.includes('-v')) {
	console.log(version);
} else if (args.includes('--init') || args.includes('-i')) {
	printLogo();
	processInit();
} else {
	printLogo();
	processBuild();
}

async function processInit() {
	let errorCode = 0;

	if (
		statSync(powpowConfigPath, {
			throwIfNoEntry: false,
		})
	) {
		console.error('⚠️ powpow.config.mjs file already exists in project root.\n');
		errorCode = 1;
	} else {
		try {
			writeFileSync(powpowConfigPath, defaultPowPowConfig);
			console.log('✅ Created powpow.config.mjs file in project root.\n');
		} catch {
			console.error('💥 Unable to create powpow.config.mjs file in project root.\n');
			errorCode = 1;
		}
	}

	if (
		statSync(tsConfigPath, {
			throwIfNoEntry: false,
		})
	) {
		console.error('⚠️ tsconfig.json file already exists in project root.\n');
		errorCode = 1;
	} else {
		try {
			writeFileSync(tsConfigPath, defaultTsConfig);
			console.log('✅ Created tsconfig.json file in project root.\n');
		} catch {
			console.error('💥 Unable to create tsconfig.json file in project root.\n');
			errorCode = 1;
		}
	}

	process.exit(errorCode);
}

async function processBuild() {
	try {
		config = (await import('file://' + powpowConfigPath)).default;
		console.log('⚙️  powpow.config.mjs config file loaded.\n');
	} catch {
		console.error('⚠️ No powpow.config.mjs file found in project root. Create one using: powpow --init\n');
		process.exit(1);
	}

	const configErrors = [];

	if (typeof config?.portal?.path !== 'string' || config.portal.path === '') {
		configErrors.push('Power Pages config path must be a non-empty string.');
	}

	if (typeof config?.typescript?.path !== 'string' || config.typescript.path === '') {
		configErrors.push('TypeScript config path must be a non-empty string.');
	}

	if (configErrors.length > 0) {
		console.error('⚠️ Invalid powpow.config.mjs file:\n' + configErrors.map((error) => `  ☝️ ${error}\n`) + '\n');
		process.exit(1);
	}

	const portalPath = resolve(cwd(), config.portal.path);
	const typeScriptPath = resolve(cwd(), config.typescript.path);

	let isWatching = false;
	const watcher = chokidar.watch(
		['*.ts', '*.tsx', '*.module.css', '_web-pages/**/*.ts', '_web-pages/**/*.tsx', '_web-templates/**/*.ts', '_web-templates/**/*.tsx', '_basic-forms/**/*.ts', '_basic-forms/**/*.tsx'].map((path) => {
			return join(typeScriptPath, path);
		}),
		{ ignoreInitial: true },
	);
	function onAddOrChange(path: string) {
		buildQueue.push(resolve(process.cwd(), path));
		triggerBuildProcess();
	}
	watcher.on('add', onAddOrChange);
	watcher.on('change', onAddOrChange);
	watcher.on('ready', () => {
		if (isWatching) return;
		isWatching = true;
		console.log(`👁️  Watching for changes...\n`);
	});

	const buildQueue: string[] = [];
	let isBuilding = false;

	async function triggerBuildProcess() {
		if (isBuilding) return;
		isBuilding = true;
		console.log(`=== [${new Date().toUTCString()}] ===\n`);
		while (buildQueue.length > 0) {
			const entryPoint = buildQueue.shift();
			await build(entryPoint);
		}
		console.log('👁️  Watching for changes...\n');
		isBuilding = false;
	}

	const devConditionBanner = `/* {%- unless ${config.typescript.devConditionInjection ?? `request.params['dev'] == 'true'`} -%} */\n`;
	const devConditionFooter = `\n/* {%- endunless -%} */`;

	const shouldMinify = !!config?.typescript?.minify;

	// TODO: Inject dev server script.
	async function build(entryPoint: string) {
		console.log(`🔨 Build started:\n\t\u2192 ${relative(process.cwd(), entryPoint)}\n`);
		const then = hrtime.bigint();
		let relativeEntryPoint = relative(typeScriptPath, entryPoint);
		let relativeTargetPath = '';
		let entryPointType: 'webpage' | 'webtemplate' | 'basicform' | 'css';
		if (relativeEntryPoint.includes('/')) {
			relativeTargetPath = relativeEntryPoint.replace(/^_*/g, '').replace(/\.tsx?$/, entryPoint.includes('webtemplate') ? '.html' : '.js');
		} else {
			const parts = relativeEntryPoint.split('.');
			const name = parts[0];

			if (relativeEntryPoint.match(/\.webtemplate\.tsx?$/)) {
				entryPointType = 'webtemplate';
				relativeTargetPath = `web-templates/${name.toLowerCase()}/${name}.webtemplate.source.html`;
			} else if (relativeEntryPoint.match(/\.webpage\.tsx?$/)) {
				entryPointType = 'webpage';
				if (parts[1] === 'webpage') {
					relativeTargetPath = `web-pages/${name.toLowerCase()}/${name}.webpage.custom_javascript.js`;
				} else {
					relativeTargetPath = `web-pages/${name.toLowerCase()}/content-pages/${name}.${parts[1]}.webpage.custom_javascript.js`;
				}
			} else if (relativeEntryPoint.match(/\.webpage\.module\.css?$/)) {
				entryPointType = 'css';
				if (parts[1] === 'webpage') {
					relativeTargetPath = `web-pages/${name.toLowerCase()}/${name}.webpage.custom_css.css`;
				} else {
					relativeTargetPath = `web-pages/${name.toLowerCase()}/content-pages/${name}.${parts[1]}.webpage.custom_css.css`;
				}
			} else if (relativeEntryPoint.match(/\.basicform\.tsx?$/)) {
				entryPointType = 'basicform';
				relativeTargetPath = `basic-forms/${name.toLowerCase()}/${name}.basicform.custom_javascript.js`;
			} else {
				console.warn(`⚠️ Ignoring entry point: ${relativeEntryPoint} (not a recognized type).\n`);
				return;
			}
		}
		const targetPath = resolve(portalPath, relativeTargetPath);
		try {
			const result = await esbuild.build({
				entryPoints: [entryPoint],
				outfile: targetPath,
				bundle: true,
				minify: shouldMinify,
				target: 'es2015',
				format: 'iife',
				banner: {
					js: entryPointType === 'webtemplate' ? '<script>' : devConditionBanner,
					css: devConditionBanner,
				},
				footer: {
					js: entryPointType === 'webtemplate' ? '</script>' : devConditionFooter,
					css: devConditionFooter,
				},
				write: false,
			});
			const now = hrtime.bigint();
			const elapsedMs = Number(now - then) / 1e6;
			if (result.errors?.length) {
				throw new Error(result.errors.map((error) => `\t\u2192 ${error}`).join('\n'));
			}
			if (result.warnings?.length) {
				console.warn(`⚠️ Build completed (in ${elapsedMs}ms) with warnings:\n${result.warnings.map((warning) => `\t\u2192 ${warning}`).join('\n')}\n`);
			}
			else {
				console.log(`✅ Build completed (in ${elapsedMs}ms).\n`);
			}
			for (let out of result.outputFiles) {
				const outPath = out.path.endsWith('.css') ? out.path.replace('custom_javascript', 'custom_css') : out.path;
				const outData = out.text;
				try {
					console.log(`\t\u2192 💾 Writing to file:\n\t     ${relative(process.cwd(), outPath)}\n`);
					writeFileSync(outPath, outData);
				} catch {
					console.error(`\t\u2192 Unable to write to file:\n\t     ${relative(process.cwd(), outPath)}\n`);
				}
			}
		} catch (error) {
			const now = hrtime.bigint();
			const elapsedMs = Number(now - then) / 1e6;
			console.error(`💥 Build failed (in ${elapsedMs}ms):\n${error instanceof Error ? error.message : error}\n`);
		}
	}

	if (config.devServer?.enabled) {
		const port = config.devServer?.port || 8080;
		http.createServer((request, response) => handler(request, response, { public: portalPath })).listen(port, () => {
			console.log(`🚀 Power Pages development server running at http://localhost:${port}\n`);
		});
	}
}

export {};
