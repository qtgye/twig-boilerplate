require('colors');
const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const notifier = require('node-notifier');
const svgSprite = require('svg2sprite');

const PROJECT_ROOT = process.cwd();
const COMPONENTS_ROOT = path.resolve(PROJECT_ROOT, 'src/components');
const SPRITE = svgSprite.collection({ inline: true });

function showError() {
	console.log(error.message.red);
	console.log((error.formatted || error.stack).gray);
	notifier.notify({
		title: 'Sprite Task Error!',
		message: error.message
	});
}

function onBuildDone() {
	console.log(`Successfully built SVG sprite!`.green);
	notifier.notify({
		title: 'SVG Sprite Done',
		message: 'Output: src/components/sprite/sprite.twig',
	});
}

function getSVGFileData(filePath) {
	const contents = fs.readFileSync(filePath).toString();
	let name = filePath.match(/[^/]+(?=\.svg)/i);

	if ( name ) {
		return {
			name: name[0],
			contents,
		}
	}

	return null
}

function getSVGPaths() {
	const matches = glob.sync(path.resolve(PROJECT_ROOT, 'src/images/icons/*.svg'));

	// Add each SVG file into the sprite
	matches.forEach(filePath => {
		const svgData = getSVGFileData(filePath);

		if ( svgData ) {
			SPRITE.add(svgData.name, svgData.contents);
		}
	});

	// Generate compiled data
	const svg = SPRITE.compile();

	// Wrap svg around a container
	const spriteHTML = `<div class="sprite">${svg}</div>`;

	// Write to component file
	fs.outputFileSync(path.resolve(COMPONENTS_ROOT, 'sprite/sprite.twig'), spriteHTML);

	onBuildDone();
}

async function build() {
	const svgFiles = getSVGPaths();
}

async function start() {
	console.clear();

	try {
		await build();
	}
	catch (err) {
		showError(err);
		process.exit(2);
	}
}

start();
