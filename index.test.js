const path = require('path');
const execSync = require('child_process').execSync;

function testCli(args, expectedOutput, cwd = 'test') {
  test(`fuzzy run script with "${args}" matches "${expectedOutput}" in ${cwd}`, () => {
    const fuzzrun = path.resolve(__dirname, 'bin/fr.js');
    args = args.split(' ');
  
    const result = execSync(`node ${fuzzrun} ${args}`, { encoding: 'utf-8', cwd });
    const lastLine = result.split('\n').filter(Boolean).pop();
    expect(lastLine).toBe(expectedOutput);
  });
}

testCli('d', 'dev');
testCli('e', 'export');
testCli('ex', 'export');
testCli('st', 'start');
testCli('sd', 'start:prod');
testCli('sp', 'start:prod');
testCli('sv', 'serve');
testCli('s', 'start');
testCli('t', 'test');
testCli('tu', 'test:unit');
testCli('db', 'docker:build');
testCli('dr', 'docker:run');
testCli('do', 'docker:run');
testCli('b', 'build');
testCli('r', 'docker:run');
testCli('d', 'dev', 'test/subdir');
