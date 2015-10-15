var path = require('path')
var fs = require('fs')

var util = require('util');
var promzard = require('promzard')
var chalk = require('chalk')

var config = require('./config')

module.exports = function(onComplete){
  //Read initial config file from home directory
  fs.readFile(config.INIT_CONFIG_FILE, 'utf-8', function(err, data){
    if (err){
      //if there is no config file create it
      if (error.code === 'ENOENT'){
        fs.readFile(config.DEFAULT_CONFIG_FILE, 'utf-8', function(error, data){
          if (err) { onComplete(err); }
          else {
            fs.writeFile(config.INIT_CONFIG_FILE, data, function() {
              configLoaded();
            });
          }
        });
      }
    }
    else {
      configLoaded();
    }
  });

  function configLoaded(){
    promzard(config.INIT_CONFIG_FILE, null, function (err, data) {
      if (err) { onComplete(err); }
      fs.writeFile(path.join(process.cwd(), config.AUTOPACK_FILE), 'module.exports = '+util.inspect(data, {depth:null}), function(err, data) {
        if (err) { onComplete(err); }
        else {
          console.log(chalk.green('Done. Feel free to further configure your settings in '+config.AUTOPACK_FILE));
          onComplete();
        }
      });
    });
  }
}
