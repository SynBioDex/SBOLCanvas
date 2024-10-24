const { writeFileSync } = require('fs');
const { promisify } = require('util');
const child = require('child_process');
const exec = promisify(child.exec);

async function createVersionsFile(filename) {
  const revision = process.argv[2]
    ?? (await exec('git rev-parse --short HEAD')).stdout.toString().trim();
  const branch = process.argv[3]
    ?? (await exec('git rev-parse --abbrev-ref HEAD')).stdout.toString().trim();
  let version = process.env.npm_package_version
    ?? (await exec('git tag --points-at HEAD')).stdout.toString().trim();

  if (version == '') {
    version = 'Latest';
  }

  console.log(`revision: '${revision}', branch: '${branch}', version: '${version}'`);

  const content = `
// this file is automatically generated by git.version.js script
exports.versions = {
  revision: '${revision}',
  branch: '${branch}',
  version: '${version}'
};`;

  writeFileSync(filename, content, { encoding: 'utf8' });
}

createVersionsFile('src/environments/versions.js');
