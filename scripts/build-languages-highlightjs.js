'use strict';
/*
 * Build javascript passthrough modules for highlight.js languages
 */
const path = require('path');
const fs = require('fs');
const camel = require('to-camel-case');
const autogenMessage =
  '//\n// This file has been auto-generated by the `npm run build-languages-hljs` task\n//\n\n';
const externalLanguages = require(path.join(
  __dirname,
  '..',
  'src',
  'languages',
  'hljs',
  'external-languages'
));

function makeImportName(name) {
  if (name === '1c') {
    return 'oneC';
  }
  return camel(name);
}

function createAsyncLanguageLoaderLine(definition) {
  const importName = makeImportName(definition.language);

  return `  ${importName}: createLanguageAsyncLoader("${importName}", () => import(/* webpackChunkName: "react-syntax-highlighter_languages_highlight_${importName}" */ "${
    definition.module
  }")),`;
}

function createAsyncLanguageLoadersIndex(definitions) {
  let lines = [
    `import createLanguageAsyncLoader from "./create-language-async-loader"`,
    `export default {`
  ];

  lines = lines.concat(
    definitions.map(definition => createAsyncLanguageLoaderLine(definition))
  );
  lines.push(`}`);

  fs.writeFile(
    path.join(__dirname, `../src/async-languages/hljs.js`),
    lines.join('\n'),
    err => {
      if (err) {
        throw err;
      }
    }
  );
}

function createExternalLanguageRegistrations(definitions) {
  let lines = [
    autogenMessage,
    `
function registerLanguage(lowlight, definition) {
  const languageModule = require(definition.module);
  if (languageModule.definer) {
    lowlight.registerLanguage(definition.language, languageModule.definer());
  } else {
    const hljsDefinition = languageModule(lowlight);
    if (hljsDefinition) {
      lowlight.registerLanguage(definition.language, hljsDefinition);
    }
  }
}

module.exports = function(lowlight) {`
  ];
  lines = lines.concat(
    definitions.map(
      definition =>
        `\n  registerLanguage(lowlight, { language: '${
          definition.language
        }', module: '${definition.module}' });`
    )
  );
  lines.push(`\n}\n`);

  fs.writeFile(
    path.join(__dirname, `../src/highlight-register-external-languages.js`),
    lines.join(''),
    err => {
      if (err) {
        throw err;
      }
    }
  );
}

function createSupportedLanguagesArray(definitions) {
  let lines = [autogenMessage, `export default [`];
  lines = lines.concat(
    definitions.map(definition => `\n  '${definition.language}',`)
  );
  lines.push(`\n];\n`);

  fs.writeFile(
    path.join(__dirname, `../src/languages/hljs/supported-languages.js`),
    lines.join(''),
    err => {
      if (err) {
        throw err;
      }
    }
  );
}

function createLanguagePassthroughModule(definition) {
  const importName = makeImportName(definition.language);
  const lines = [
    `import ${importName} from "${definition.module}"`,
    `export default ${importName}`,
    ''
  ];

  fs.writeFile(
    path.join(__dirname, `../src/languages/hljs/${definition.language}.js`),
    lines.join(';\n'),
    err => {
      if (err) {
        throw err;
      }
    }
  );
}

fs.readdir(
  path.join(__dirname, '../node_modules/highlight.js/lib/languages'),
  (err, files) => {
    if (err) {
      throw err;
    }

    const allLanguages = files
      .map(file => {
        const fileWithoutJS = file.split('.js')[0];
        return {
          language: fileWithoutJS,
          module: `highlight.js/lib/languages/${fileWithoutJS}`
        };
      })
      .concat(externalLanguages)
      .sort((a, b) => (a.language < b.language ? -1 : 1));

    allLanguages.forEach(createLanguagePassthroughModule);

    createAsyncLanguageLoadersIndex(allLanguages);
    createSupportedLanguagesArray(allLanguages);
    createExternalLanguageRegistrations(externalLanguages);

    const availableLanguageNames = allLanguages.map(
      definition => definition.language
    );
    const languagesLi = availableLanguageNames.map(
      name =>
        `\n* ${makeImportName(name)}${
          makeImportName(name) !== name ? ` (${name})` : ''
        }`
    );
    const languageMD = `## Available \`language\` imports ${languagesLi.join(
      ''
    )}`;
    fs.writeFile(
      path.join(__dirname, '../AVAILABLE_LANGUAGES_HLJS.MD'),
      languageMD,
      err => {
        if (err) {
          throw err;
        }
      }
    );

    const defaultExports = availableLanguageNames.map(
      name =>
        `export { default as ${makeImportName(name)} } from './${name}';\n`
    );
    fs.writeFile(
      path.join(__dirname, '../src/languages/hljs/index.js'),
      defaultExports.join(''),
      err => {
        if (err) {
          throw err;
        }
      }
    );
  }
);
