import path from 'node:path';
import process from 'node:process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import spawn from 'cross-spawn';
import fuzzysort from 'fuzzysort';
import chalk from 'chalk-template';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appName = path.basename(process.argv[1]);
const help = chalk`{bold Usage:} ${appName} {green <fuzzy_script_name>}|{cyan <action>} [script_options]
{bold Actions:}
  {cyan -u, --update}   Check outdated packages and run an interactive update
  {cyan -r, --refresh}  Delete node_modules and lockfile, and reinstall packages
`;
const chalkTemplate = (string_) => chalk(Object.assign([], { raw: [string_] }));

export function fuzzyRun(args, packageManager = null) {
  try {
    const packageFile = findPackageFile(process.cwd());
    if (!packageFile) {
      throw new Error(chalk`Error, {yellow package.json} not found\n`);
    }

    const packageDir = path.dirname(packageFile);
    const scripts = getScripts(packageFile);

    if (args.length === 0 || args[0] === '--help') {
      console.log(help);
      showScripts(scripts);
    }

    packageManager = packageManager || getPackageManager(packageDir);
    const name = args[0];

    if (name === '--version') {
      const pkg = fs.readFileSync(path.join(__dirname, 'package.json'));
      const pkgJson = JSON.parse(pkg);
      return console.log(pkgJson.version);
    }

    if (name === '-u' || name === '--update') {
      return updatePackages(packageManager);
    }

    if (name === '-r' || name === '--refresh') {
      return refreshPackages(packageManager, packageDir);
    }

    let scriptName = name;

    if (!scripts[name]) {
      const match = matchScript(name, Object.keys(scripts));
      if (!match) {
        console.error(chalk`No script match for {yellow ${name}}\n`);
        showScripts(scripts);
      }

      const highlightedName = fuzzysort.highlight(match, '{underline ', '}');
      console.log(chalkTemplate(`Running {green ${highlightedName}}`));
      scriptName = match.target;
    }

    spawn.sync(
      packageManager,
      [
        'run',
        scriptName,
        ...(packageManager === 'npm' ? ['--'] : []),
        ...args.slice(1)
      ],
      { stdio: 'inherit' }
    );
  } catch (error) {
    if (error.message) {
      console.error(error.message);
    }

    process.exitCode = -1;
  }
}

function findPackageFile(basePath) {
  const find = (components) => {
    if (components.length === 0) {
      return null;
    }

    const dir = path.join(...components);
    const packageFile = path.join(dir, 'package.json');
    return fs.existsSync(packageFile)
      ? packageFile
      : find(components.slice(0, -1));
  };

  const components = basePath.split(/[/\\]/);
  if (components.length > 0 && components[0].length === 0) {
    // When path starts with a slash, the first path component is empty string
    components[0] = path.sep;
  }

  return find(components);
}

function getScripts(packageFile) {
  const projectPackageFile = fs.readFileSync(packageFile);
  const projectPackage = JSON.parse(projectPackageFile);
  return projectPackage.scripts || [];
}

function getPackageManager(packageDir) {
  // TODO: add process.env support NODE_PACKAGE_MANAGER
  return fs.existsSync(path.join(packageDir, 'yarn.lock')) ? 'yarn' : 'npm';
}

function matchScript(string_, scriptNames) {
  const match = fuzzysort.go(string_, scriptNames, {
    limit: 1,
    allowTypo: true
  })[0];
  return match || null;
}

function showScripts(scripts) {
  scripts = Object.keys(scripts);
  if (scripts.length === 0) {
    throw new Error(
      chalk`{yellow No scripts found in your} package.json {yellow file}\n`
    );
  }

  const scriptNames = scripts.map((script) => chalk`{green ${script}}`);
  throw new Error(
    chalk`{bold Available NPM Scripts:}\n- ${scriptNames.join('\n- ')}\n`
  );
}

function updatePackages(packageManager) {
  if (packageManager === 'yarn') {
    spawn.sync('yarn', ['upgrade-interactive', '--latest'], {
      stdio: 'inherit'
    });
  } else {
    spawn.sync('npx', ['-y', 'npm-check', '-u'], { stdio: 'inherit' });
  }
}

function refreshPackages(packageManager, packageDir) {
  fs.rmSync(path.join(packageDir, 'node_modules'), { recursive: true });

  if (packageManager === 'yarn') {
    fs.rm(path.join(packageDir, 'yarn.lock'), { force: true });
  } else {
    fs.rm(path.join(packageDir, 'package-lock.json'), { force: true });
  }

  spawn.sync(packageManager, ['install'], { stdio: 'inherit' });
}
