const path = require('path');
const execSync = require('child_process').execSync;

function expectCli(args, expectedOutput, cwd = 'test') {
  const fuzzrun = path.resolve(__dirname, 'bin/fr.js');
  args = args.split(' ');

  const result = execSync(`node ${fuzzrun} ${args}`, { encoding: 'utf-8', cwd });
  const lastLine = result.split('\n').filter(Boolean).pop();
  expect(lastLine).toBe(expectedOutput);
}

test('fuzzy run script matches', () => {
  expectCli('d', 'dev');
  expectCli('e', 'export');
  expectCli('ex', 'export');
  expectCli('st', 'start');
  expectCli('sd', 'start:prod');
  expectCli('sp', 'start:prod');
  expectCli('sv', 'serve');
  expectCli('s', 'serve');
  expectCli('t', 'test');
  expectCli('tu', 'test:unit');
  expectCli('db', 'docker:build');
  expectCli('dr', 'docker:run');
  expectCli('do', 'docker:run');
  expectCli('b', 'build');
  expectCli('r', 'docker:run');
});

test('fuzzy run script works in subdir', () => {
  expectCli('d', 'dev', 'test/subdir');
});
