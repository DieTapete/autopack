var path = require('path');

var c = {};
c.HOME_DIRECTORY    = (process.platform === 'win32') ? process.env.HOMEPATH : process.env.HOME;
c.INIT_CONFIG_FILE  = path.join(c.HOME_DIRECTORY, '.autopack-init.js');
c.AUTOPACK_HOME     = __dirname;
c.AUTOPACK_FILE     = 'autopackfile.js';
c.DEFAULT_CONFIG_FILE     = path.resolve(__dirname, '../autopackfile.init.js');

module.exports = c;
