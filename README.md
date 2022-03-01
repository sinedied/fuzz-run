# :runner: fuzz-run

[![NPM version](https://img.shields.io/npm/v/fuzz-run.svg)](https://www.npmjs.com/package/fuzz-run)
[![Build Status](https://github.com/sinedied/fuzz-run/workflows/ci/badge.svg)](https://github.com/sinedied/fuzz-run/actions)
![Node version](https://img.shields.io/node/v/fuzz-run.svg)
[![Install size](https://packagephobia.now.sh/badge?p=fuzz-run)](https://packagephobia.now.sh/result?p=fuzz-run)
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> Run all your NPM scripts more easily with fuzzy matching.

**Features:**
- Fuzzy matching of NPM script name, optimized for commands (see [alternatives](#alternatives))
- Yarn support: if a `yarn.lock` file is found, `yarn <script>` will be used instead of `npm run <script>`
- No need for `--` to pass extra options when using NPM
- Extra actions for common recurrent tasks

## Installation

```sh
npm install -g fuzz-run
```

## CLI Usage

```sh
Usage: fr <fuzzy_script_name>|<action> [script_options]
Actions:
  -u, --update   Check outdated packages and run an interactive update
  -r, --refresh  Delete node_modules and lockfile, and reinstall packages
```

If no arguments are provided, it will list all available scripts.

As the name of the script to run is fuzzy matched, you can try:
- typing only some letters of the script name, regardless of their position (first letters weights more), like `t` for `test` script
- typing first letter of compound script names like `tc` for `test:ci` script
- making some typos, like `ets` for `test` script

Note that you can use the alias `nr` (for **n**pm **r**un) instead of `fr` (**f**uzz **r**un) if you prefer :wink:

You can pass any arguments to your script if needed, like `fr t --coverage`. You don't need to use `--` to pass extra options to your script like when using `npm` directly.

### Actions

There are a few scripted actions you can use for common day-to-day tasks in your projects:

- `-u` or `--update`: It will check for outdated packages and run an interactive update, using under the hood `npx npm-check -u` if NPM is your package manager or `yarn upgrade-interactive` if you use Yarn.
- `-r` or `--refresh`: It will delete `node_modules` folder and lockfile, and reinstall all your packages. I probably use that more than I should, but it's always a handy fix.

## API

You can also integrate this script runner in your own CLI by using the function `fuzzyRun(args, packageManager)`:

- `args`: array of arguments, the same you would use for the CLI usage
- `packageManager`: *optional*, can be 'npm' or 'yarn' to force a specific command to run the scripts. If `null` or `undefined`, it will be autodetected based on the presence of the `yarn.lock` file.

Example:
```js
const fuzzyRun = require('fuzzy-run');
fuzzyRun(process.argv.slice(2));
```

## Alternatives
- [fuzzy-npm-run](https://www.npmjs.com/package/fuzzy-npm-run)
- [fuzzy-run](https://www.npmjs.com/package/fuzzy-run)

Why making a new tool when some other exists, you might ask?
Both are based on [fuse.js](http://fusejs.io) for the fuzzy matching, which is not great for matching commands, as it doesn't weight properly specific features like subcommands separation (using characters like `-`, `_`, `:`) or first character of words :disappointed:

Some examples:
- if you have 2 scripts `test` and `test:ci`, typing `tc` matches `test` instead of `test:ci`
- if you have 2 scripts `test:ci` and `other`, typing `t` matches `other`

So I benchmarked many fuzzy matching libraries, and kept the best one I found suited for the job, [fuzzysort](https://www.npmjs.com/package/fuzzysort), that solves these issues.
