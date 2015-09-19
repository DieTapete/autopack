#!/usr/bin/env node

'use strict';
var chalk = require('chalk');
var semver = require('semver');
var Liftoff = require('liftoff');
var tildify = require('tildify');
var interpret = require('interpret');
var v8flags = require('v8flags');
var argv = require('minimist')(process.argv.slice(2));

// Set env var for ORIGINAL cwd
// before anything touches it
process.env.INIT_CWD = process.cwd();

var cli = new Liftoff({
  name: 'autopack',
  extensions: interpret.jsVariants,
  v8flags: v8flags
});

// Exit with 0 or 1
var failed = false;
process.once('exit', function(code) {
  if (code === 0 && failed) {
    process.exit(1);
  }
});

var log = argv.silent ? function(){} : function(string){
  console.log(string);
}

cli.on('require', function(name) {
  log('Requiring external module'+ chalk.magenta(name));
});

cli.on('requireFail', function(name) {
  log(chalk.red('Failed to load external module')+ chalk.magenta(name));
});

cli.on('respawn', function(flags, child) {
  var nodeFlags = chalk.magenta(flags.join(', '));
  var pid = chalk.magenta(child.pid);
  log('Node flags detected:'+ nodeFlags);
  log('Respawned to PID:'+ pid);
});

// Parse those args m8
var cliPackage = require('../package');
var versionFlag = argv.v || argv.version;
var inputFlag = getArg('input');
var outputFlag = getArg('output');

function getArg(word){
  return argv[word.charAt(0)] || argv[word];
}
cli.launch({
  cwd: argv.cwd,
  configPath: argv.autopackfile,
  require: argv.require,
  completion: argv.completion,
}, handleArguments);

// The actual logic
function handleArguments(env) {
  if (versionFlag) {
    log('CLI version'+ cliPackage.version);
    if (env.modulePackage && typeof env.modulePackage.version !== 'undefined') {
      log('Local version'+ env.modulePackage.version);
    }
    process.exit(0);
  }

  if (!env.modulePath) {
    log(
      chalk.red('Local autopack not found in'),
      chalk.magenta(tildify(env.cwd))
    );
    log(chalk.red('Try running: npm install autopack'));
    process.exit(1);
  }

  if (!env.configPath) {
    log(chalk.yellow('Warning: No autopackfile found. Using defaults.'));
    // process.exit(1);
  }

  // Check for semver difference between cli and local installation
  if (semver.gt(cliPackage.version, env.modulePackage.version)) {
    log(chalk.red('Warning: autopack version mismatch:'));
    log(chalk.red('Global autopack is '+ cliPackage.version));
    log(chalk.red('Local autopack is '+ env.modulePackage.version));
  }

  // Chdir before requiring autopack to make sure
  // we let them chdir as needed
  if (process.cwd() !== env.cwd) {
    process.chdir(env.cwd);
    log(
      'Working directory changed to '+
      chalk.magenta(tildify(env.cwd))
    );
  }

  // This is what actually loads up the autopackfile
  var options = {};
  if (env.configPath) {
    options = require(env.configPath);
    log('Using autopackfile '+ chalk.magenta(tildify(env.configPath)));
  }else{
    options = require('../autopackfile.js');
  }

  var autopackInst = require(env.modulePath);
  // logEvents(autopackInst);

  process.nextTick(function() {
    // autopackInst.start.apply(autopackInst, toRun);
    if (inputFlag) options.entryFile = inputFlag;
    if (outputFlag) options.output.dir = outputFlag;
    autopackInst(options);
  });
}

// Format orchestrator errors
/*function formatError(e) {
  if (!e.err) {
    return e.message;
  }

  // PluginError
  if (typeof e.err.showStack === 'boolean') {
    return e.err.toString();
  }

  // Normal error
  if (e.err.stack) {
    return e.err.stack;
  }

  // Unknown (string, number, etc.)
  return new Error(String(e.err)).stack;
}*/

// Wire up logging events
function logEvents(autopackInst) {

  // Total hack due to poor error management in orchestrator
  autopackInst.on('err', function() {
    failed = true;
  });

  /*gulpInst.on('task_start', function(e) {
    // TODO: batch these
    // so when 5 tasks start at once it only logs one time with all 5
    gutil.log('Starting', '\'' + chalk.cyan(e.task) + '\'...');
  });

  gulpInst.on('task_stop', function(e) {
    var time = prettyTime(e.hrDuration);
    gutil.log(
      'Finished', '\'' + chalk.cyan(e.task) + '\'',
      'after', chalk.magenta(time)
    );
  });

  gulpInst.on('task_err', function(e) {
    var msg = formatError(e);
    var time = prettyTime(e.hrDuration);
    gutil.log(
      '\'' + chalk.cyan(e.task) + '\'',
      chalk.red('errored after'),
      chalk.magenta(time)
    );
    gutil.log(msg);
  });

  gulpInst.on('task_not_found', function(err) {
    gutil.log(
      chalk.red('Task \'' + err.task + '\' is not in your gulpfile')
    );
    gutil.log('Please check the documentation for proper gulpfile formatting');
    process.exit(1);
  });*/
}
