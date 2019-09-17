const cp = require('child_process');
const fs = require('fs-extra');
const { dirsSync } = require('fs-walk');
const path = require('path');
const express = require('express');
const Twing = require('twing');

const PORT = 9999;

const PROJECT_ROOT = process.cwd();
const PAGES_DIR = path.resolve(PROJECT_ROOT, 'src/pages');

// Static Server Twing
const twigLoader = new Twing.TwingLoaderFilesystem(path.resolve(PAGES_DIR));
const twig = new Twing.TwingEnvironment(twigLoader, { debug: true });

twigLoader.addPath(path.resolve(PROJECT_ROOT, 'src/components'), 'components');
twigLoader.addPath(path.resolve(PROJECT_ROOT, 'src/layouts'), 'layouts');

function startServer() {
  const app = express();
  const templatePaths = /^\/(components|layouts|pages|partials)/;

	app.use('/public', express.static(`${process.cwd()}/public`));
  app.use('/src', express.static(`${process.cwd()}/src`));

  app.get('/:page?', (req, res) => {
		// Use home if 'page' param is not given
    const page = req.params.page || 'home';

    // Clear twig cache
    twig.loadedTemplates.clear();

		// Render output
    const output = twig.render(`${page}/${page}.twig`);

    res.send(output);
  });

  server = app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}!`);
    if (typeof callback === 'function') {
      callback();
    }
  });
}

// Start server
startServer();
