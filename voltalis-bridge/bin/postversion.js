const fs = require('fs');
const path = require('path');
const shell = require('shelljs');

const VERSION = process.env.npm_package_version;
const NAME = process.env.npm_package_name;
const CHANGELOG_TAG = '<!-- changelog_start -->';

if(!VERSION) {
  console.log('Missing env var npm_package_version');
  process.exit(1);
}
const configPath = path.join(__dirname, '../config.json');
const changelogPath = path.join(__dirname, '../CHANGELOG.md');

const config = JSON.parse(fs.readFileSync(configPath), { encoding: 'utf-8' });
const previousVersion = config.version;
config.version = VERSION;

fs.writeFileSync(configPath, JSON.stringify(config, null, 2), { encoding: 'utf-8' })


const { stdout } = shell.exec(`git log v${VERSION}...v${previousVersion} --oneline --pretty=format:"- %s\n"`, { silent: true });

const commits = stdout.split('\n').reduce((acc, commit) => {
  if(commit.match(new RegExp(`^- \\w+\\(${NAME}\\)`, 'ig'))){
    acc.push(commit.replace(`(${NAME})`, ''));
  }

  return acc;
}, [])

const fileContent = fs.readFileSync(changelogPath, { encoding: 'utf-8' });

const [head, tail] = fileContent.split(CHANGELOG_TAG);
const versionHeader = `## ${VERSION} (${new Date().toISOString().replace(/T.*/, '')})\n`;

const versionReleaseNote = [
  versionHeader,
  '\n',
  commits.join('\n')
].join('');

const content = [
  head,
  CHANGELOG_TAG,
  '\n',
  versionReleaseNote,
  tail,
].join('');

fs.writeFileSync(changelogPath, content, { encoding: 'utf-8'});
