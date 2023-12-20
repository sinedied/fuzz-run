import path from 'node:path';
import process from 'node:process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import spawn from 'cross-spawn';
import fuzzysort from 'fuzzysort';
import chalk from 'chalk-template';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appName = path.basename(process.argv[1]);
const help = chalk`{bold Usage:} ${appName} {green <fuzzy_script_name>}|{cyan <action>} [script_options]
{bold Actions:}
  {cyan -u, --update}   Show outdated packages and run an interactive update
  {cyan -r, --refresh}  Delete node_modules and lockfile, and reinstall packages
`;
const npmLockFile = 'package-lock.json';
const yarnLockFile = 'yarn.lock';
const pnpmLockFile = 'pnpm-lock.yaml';
const chalkTemplate = (string_) => chalk(Object.assign([], { raw: [string_] }));

export async function fuzzyRun(args, packageManager = undefined) {
  try {
    const packageFile = findFileUp(process.cwd(), 'package.json');
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

function findFileUp(basePath, file) {
  const find = (components) => {
    if (components.length === 0) {
      return undefined;
    }

    const dir = path.join(...components);
    const packageFile = path.join(dir, file);
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
  let packageManager = process.env.NODE_PACKAGE_MANAGER;
  if (packageManager && packageManager !== 'npm' && packageManager !== 'yarn') {
    throw new Error(
      chalk`{yellow Unsupported package manager: ${packageManager}}\n`
    );
  }

  if (!packageManager) {
    const hasNpmLock = findFileUp(packageDir, npmLockFile) !== undefined;
    const hasYarnLock = findFileUp(packageDir, yarnLockFile) !== undefined;
    const hasPnpmLock = findFileUp(packageDir, pnpmLockFile) !== undefined;

    if (hasPnpmLock && !hasNpmLock && !hasYarnLock) {
      packageManager = 'pnpm';
    } else if (hasYarnLock && !hasNpmLock) {
      packageManager = 'yarn';
    } else {
      packageManager = 'npm';
    }
  }

  return packageManager;
}

function matchScript(string_, scriptNames) {
  const match = fuzzysort.go(string_, scriptNames, {
    limit: 1,
    allowTypo: true
  })[0];
  return match || undefined;
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

async function askForInput(question) {
  return new Promise((resolve, _reject) => {
    const read = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    read.question(question, (answer) => {
      read.close();
      resolve(answer);
    });
  });
}

async function updatePackages(packageManager) {
  const { status } = spawn.sync(packageManager, ['outdated'], {
    stdio: 'inherit'
  });
  if (status === 0) {
    console.log(`Nothing to update.\n`);
    return;
  }

  const answer = await askForInput(`\nDo you want to update now? [Y/n] `);
  if (answer !== '' && answer.toLowerCase() !== 'y') {
    return;
  }

  spawn.sync(
    packageManager,
    [packageManager === 'yarn' ? 'upgrade' : 'update'],
    { stdio: 'inherit' }
  );

  if (packageManager === 'yarn') {
    spawn.sync('yarn', ['upgrade-interactive', '--latest'], {
      stdio: 'inherit'
    });
  } else {
    if (packageManager === 'pnpm') {
      process.env.NPM_CHECK_INSTALLER = 'pnpm';
    }

    spawn.sync('npx', ['-y', 'npm-check', '-u'], { stdio: 'inherit' });
  }
}

function refreshPackages(packageManager, packageDir) {
  const nodeModulesDir = path.join(packageDir, 'node_modules');
  console.log(chalk`Removing {green node_modules}...`);

  if (fs.existsSync(nodeModulesDir)) {
    if (fs.rmSync) {
      fs.rmSync(nodeModulesDir, { recursive: true });
    } else {
      // Compatibility Node.js < 14
      fs.rmdirSync(nodeModulesDir, { recursive: true });
    }
  }

  let lockFile = npmLockFile;
  if (packageManager === 'yarn') {
    lockFile = yarnLockFile;
  } else if (packageManager === 'pnpm') {
    lockFile = pnpmLockFile;
  }

  console.log(chalk`Removing {green ${lockFile}}...`);
  lockFile = path.join(packageDir, lockFile);

  if (fs.existsSync(lockFile)) {
    if (fs.rmSync) {
      fs.rmSync(lockFile);
    } else {
      // Compatibility Node.js < 14
      fs.unlinkSync(lockFile);
    }
  }

  console.log(chalk`Running {green ${packageManager} install}...`);
  spawn.sync(packageManager, ['install'], { stdio: 'inherit' });
}
