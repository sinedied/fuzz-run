const path = require('path');
const fs = require('fs');
const spawn = require('cross-spawn');
const fuzzysort = require('fuzzysort');
const chalk = require('chalk');

const appName = path.basename(process.argv[1]);
const help = chalk`{bold Usage:} ${appName} {green <fuzzy_script_name>}\n`;
const chalkTemplate = str => chalk(Object.assign([], {raw: [str]}));

function fuzzyRun(args, runner = null) {
  try {
    const packageFile = findPackageFile(process.cwd());
    const scripts = getScripts(packageFile);

    if (args.length === 0) {
      console.log(help);
      showScripts(scripts);
    }

    const name = args[0];
    let scriptName = name;
    runner = runner || getPackageManager(path.dirname(packageFile));

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
      runner,
      ['run', scriptName].concat(
        runner === 'npm' ? ['--'] : [],
        args.splice(1)
      ),
      {stdio: 'inherit'}
    );
  } catch (error) {
    if (error.message) {
      console.error(error.message);
    }
    process.exitCode = -1;
  }
}

function findPackageFile(basePath) {
  const find = components => {
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
  const projectPackage = packageFile ? require(packageFile) : null;
  if (!projectPackage) {
    throw new Error(chalk`Error, {yello package.json} not found\n`);
  }
  return projectPackage.scripts || [];
}

function getPackageManager(packageDir) {
  return fs.existsSync(path.join(packageDir, 'yarn.lock')) ? 'yarn' : 'npm';
}

function matchScript(str, scriptNames) {
  const match = fuzzysort.go(str, scriptNames, {limit: 1, allowTypo: true})[0];
  return match || null;
}

function showScripts(scripts) {
  scripts = Object.keys(scripts);
  if (scripts.length === 0) {
    throw new Error(
      chalk`{yellow No scripts found in your} package.json {yellow file}\n`
    );
  }
  throw new Error(chalk`{bold Scripts:}\n- ${scripts.join('\n- ')}\n`);
}

module.exports = fuzzyRun;
