// Updater de commit-and-tag-version para `libs/core/src/lib/observabilidad/version.ts`:
// mantiene la versión del front (release de Sentry) igual a la de package.json.
const PATRON = /VERSION_FRONT = '([^']+)'/;

module.exports.readVersion = (contents) => PATRON.exec(contents)[1];

module.exports.writeVersion = (contents, version) =>
  contents.replace(PATRON, `VERSION_FRONT = '${version}'`);
