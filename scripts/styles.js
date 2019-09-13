/*
 * Overrides build/browserify.js from the nsdq theme
 */

require('colors');
const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const sass = require('node-sass');
const chokidar = require('chokidar');
const stylelint = require('stylelint');
const postcss = require('postcss');
const notifier = require('node-notifier');

const PROJECT_ROOT = process.cwd();
const COMPONENTS_ROOT = path.resolve(PROJECT_ROOT, 'src/components');
const LAYOUTS_ROOT = path.resolve(PROJECT_ROOT, 'src/layouts');
const PAGES_ROOT = path.resolve(PROJECT_ROOT, 'src/pages');

// GLOBALS

// Should hold an ID for the current compile process
let compileID;

// Should hold an ID for the current lint process
let lintID;

// SETTINGS

const sassConfig = {
	includePaths: [
		path.resolve(PROJECT_ROOT, 'src/styles'),
		path.resolve(PROJECT_ROOT, 'src'),
	],
	sourceMapEmbed: true,
	// outputStyle: 'compressed',
};

const postCSSPlugins = [
  require('autoprefixer'),
  require('postcss-pxtorem')({
    rootValue: 16,
    propList: ['*', '!letter-spacing'],
    selectorBlackList: [],
    mediaQuery: true,
    minPixelValue: 0
  })
];

const stylelintConfig = {
	configFile: '.stylelintrc',
	configBasedir: PROJECT_ROOT,
	formatter: 'string'
}

// Walks through the src directory to get additional imports paths
// from components, layouts, and pages
function getAdditionalImports() {
	const components = glob.sync(path.resolve(COMPONENTS_ROOT, '**/*.scss'));
	const layouts = glob.sync(path.resolve(LAYOUTS_ROOT, '**/*.scss'));
	const pages = glob.sync(path.resolve(PAGES_ROOT, '**/*.scss'));

	// Format into SCSS import syntax
	// e.g. @import "components/header/header";
	const importPaths = [...components, ...layouts, ...pages].map(path => {
		const noSrcPath = path.replace(PROJECT_ROOT + '/src/', '');
		const importPath = noSrcPath.replace(/(_(?=.+\.scss)|\.scss$)/gi, '');
		return `@import "${importPath}";`;
	});

	return importPaths;
}

// @param file - source SCSS absolute path
function compileFile(file) {
	return new Promise((resolve, reject) => {
		let mainData = fs.readFileSync(file).toString();
		const importsArray = getAdditionalImports();

		// Append additional imports
		mainData += importsArray.join(`\n`);

		const result = sass.render({
			data: mainData,
			...sassConfig
		}, (err, result) => {
			if ( err ) {
				reject(err);
			}
			else {
				resolve(result);
			}
		});
	});
}

function writeCSS(css, file) {
	fs.outputFileSync(file, css);
}

function onBuildDone(elapsed) {
	console.log(`\nCompiled styles! ~${elapsed / 1000}s`.green);

	notifier.notify({
		title: 'Styles Compiled!',
		message: `Compiled in ~${elapsed / 1000}s`
	});
}

// Processes CSS data
async function postProcessCSS(css, from = undefined) {
	return postcss(postCSSPlugins).process(css, { from });
}

// Processes a single file
// @param filePath - the absolute path to the source file
async function processFile(filePath) {
	const basePath = filePath.replace(path.resolve(PROJECT_ROOT, 'src') + '/', '');
	const outputFile = path.resolve(PROJECT_ROOT, 'public/styles/styles.css');

	// Will hold output CSS data
	let css = '';

	// Ignore SCSS files with _ in the beginning
	if ( /\/_[^/]+\.scss$/i.test(filePath) ) {
		return;
	}

	try {
		// Render CSS
		const result = await compileFile(filePath);
		css = result.css.toString();
	}
	catch (err) {
		err.formatted = err.formatted.replace('stdin', basePath);
		throw err;
	}

	// Postprocess CSS
	const postProcessedCSS = await postProcessCSS(css, basePath);

	// Write to file
	writeCSS(postProcessedCSS, outputFile);
	// console.log(`Compiled ${outputFile.replace(projectThemePath() + '/', '')}`.green);
}

async function compile(mainFile) {
	return new Promise(async (resolve, reject) => {
		console.log(`\nCompiling styles...`.magenta);

		const start = Date.now();

		try {
			await processFile(mainFile);
			const end = Date.now();

			onBuildDone(end - start);
			resolve();
		}
		catch (err) {
			reject(err);
		}
	});
}

async function lint(files) {
	console.log(`\nLinting styles...`.magenta);

	const start = Date.now();

	try {
		const resultObject = await stylelint.lint({ files, ...stylelintConfig });

		if ( resultObject.errored ) {
			const error = new Error(`\nError while linting styles!`);
			error.formatted = resultObject.output;
			throw error;
		}

		const end = Date.now();
		const elapsed = (end - start) / 1000;
		console.log(`\nFinished linting ${files.length} files! ~${elapsed}s`.green);

		notifier.notify({
			title: 'Stylelint Done!',
			message: `Finished linting ${files.length} files! ~${elapsed}s`
		});
	}
	catch (err) {
		throw err;
	}
}

async function build() {
	const start = Date.now();
	const mainFile = path.resolve(PROJECT_ROOT, 'src/styles/main.scss');
	const files = glob.sync(path.resolve(PROJECT_ROOT, 'src/**/*.scss'));

	try {
		// Wait for both the build process and the listener
		// Should the listener finished first, this should stop the build process
		await Promise.all([ compile(mainFile), lint(files) ]);
	}
	catch ( err ) {
		throw err;
	}

	const end = Date.now();
	const elapsed = (end - start) / 1000;
	console.log(`\n\nDONE!!! (~${elapsed}s)`.green);
}

async function onWatchEvent(event, path) {
	// Ensure we are picking up SCSS file only
  if ( path.match(/\.scss$/) ) {
  	console.clear();
    console.log(`\nFile ${event}ed: ${path}`.cyan);
    try {
    	await build();
    }
    catch (err) {
    	showError(err);
    }
  }
}

function watch() {
	const srcPath = path.resolve(PROJECT_ROOT, 'src');

	// Watch changes on src folder
	chokidar.watch(srcPath)
		.on('change', path => onWatchEvent('change', path))
		.on('unlink', path => onWatchEvent('unlink', path));
}

function showError(error) {
	console.log(error.message.red);
	console.log((error.formatted || error.stack).gray);
	notifier.notify({
		title: 'Stylelint Task Error!',
		message: error.message
	});
}

async function start() {
	console.clear();

	try {
		await build();

		if ( process.argv.includes('--watch') || process.argv.includes('-w') ) {
			watch();
		}
	}
	catch (err) {
		showError(err);
		process.exit(2);
	}
}

start();
