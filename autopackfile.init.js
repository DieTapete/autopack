var fs = require('fs')

module.exports = {
  entry: prompt('Whats the name of the HTML file you want autopack to work on?', 'index.html'),
  output : prompt("Where do you want autopack to put the generated files (directory will be created if it doesn`t exist)?", 'build'),
  pack:{
    html: {
      name: 'index.html',
      minify: false
    },
    css: {
      name: prompt("Do you want to bundle your CSS to a single file? If so give it a name", 'style.css', testEmptyString),
      local: { concat: true, minify: true },
      inline: { concat: false, minify: true },
      exclude: [],
      append: 'head'
    },
    js: {
      name: prompt("Do you want to bundle your JS to a single file? If so give it a name", 'bundle.js', testEmptyString),
      local: { concat: true,  minify: true },
      inline: { concat: false, minify: true },
      exclude: [],
      append: 'body'
    }
  },
  copy: [],
  remove: []
};

//Helper functions
function testEmptyString(data){
  if (data.length == 0){
    return false;
  }
  return data;
}
