var fs = require('fs');
var path = require('path');

var _ = require('underscore');
var cheerio = require('cheerio');
var concat = require('concat-files');
var UglifyJS = require("uglify-js");
var CleanCSS = require('clean-css');

var chalk = require('chalk');

var copy = require('copy-files');
var glob = require("glob");
var mkdirp = require('mkdirp');

const  MINIFY_JS_DEFAULTS = {
  inline: true,
  local: true,
  remote: false, //NOT SUPPORTED YET
  exclude:[]
};
const  MINIFY_CSS_DEFAULTS = {
  inline: true,
  local: true,
  remote: false, //NOT SUPPORTED YET
  exclude:[]
};
const  MINIFY_HTML_DEFAULTS = {
  //options of htmlparser2 apply
  normalizeWhitespace: true
};

const VERBOSE = true;
var _options = {},
  scriptElements,
  originalCWD = process.cwd();

module.exports = function(options){
  _options = sanitizeOptions(options);

  try {
    log('changing cwd to '+_options.basePath);
    process.chdir(_options.basePath);
  }
  catch (err) {
    console.error('chdir: ' + err);
  }

  //create output folder and sub directories
  mkdirp(_options.output.dir, function(err){
    if (err) throw err;

    var numSubDirectories = 0, numCreatedSubDirectories = 0;
    _.each(_options.output, function(target){
      if (target != _options.output.dir){
        var directory = path.dirname(target);
        if (directory != '.') {
          log('Creating directory '+directory+' in output directory.');
          numSubDirectories++;
          mkdirp(path.join(_options.output.dir,directory), function(){
            numCreatedSubDirectories++;
            //All directories created, let's go.
            if(numCreatedSubDirectories == numSubDirectories){
              readFile(path.basename(_options.entryFile), function(htmlString){
                compile(htmlString);
              });
              copyFiles();
            }
          });
        }
      }
    });
  });
}

process.on('exit', function(code) {
  try {
    log('reverting cwd back to '+originalCWD);
    process.chdir(originalCWD);
    if (code == 0){
      log(chalk.bgBlue.black.bold('\n Finished. You find your files neatly packed together in "'+_options.output.dir+'".'));
    }
  }
  catch (err) {
    console.error('chdir: ' + err);
  }
});

function copyFiles(){
  logTitle('Copying files...');
  _.each(_options.copy, function(copyEntry){
    log("file pattern: "+copyEntry);
    glob(copyEntry, {ignore:_options.output.dir}, function (err, files) {
      if (err){
        console.error(err);
      }
      else{
        if (files.length>0){
          _.each(files, function(file){
            log('trying to copy file '+file);
            var targetFile = path.join(_options.output.dir, file);
            if (fs.lstatSync(targetFile).isFile()) {
              mkdirp(path.dirname(targetFile), function (err) {
                  if (err) console.error(err);
                  else {
                    fs.createReadStream(file).pipe(fs.createWriteStream(targetFile));
                  }
              });
            }else{
              log(chalk.bgYellow.black(targetFile +' is a directory. skipping.'));
            }
          })
        }
      }
    })
  });

  /*copy({
  files: {
    'newname.txt': options.basePath + '/path/to/source.txt'
  },
  dest: '/path/to/destination',
}, function (err) {
  err ? log(err):log('All files copied.');
});*/
}

function compile(htmlString) {
  var out = _options.output;
  logTitle('compiling files');
  log('compiling js files..');
  scriptElements = getScripts(htmlString);
  var jsString = concatJS(scriptElements);
  if (jsString.length>1){
    writeFile(path.join(out.dir, out.js), jsString, function(){
      log('done compiling js');
    });
  }

  log('compiling css files..');
  compileStyles(_.pluck(getStyles(htmlString), 'href'), path.join(out.dir, out.css), function(){
    log('done compiling css');
    // onComplete && onComplete();
  });

  compileHTML(htmlString);
}


function sanitizeOptions(options) {
  options.minify.js = defaults(options.minify.js, MINIFY_JS_DEFAULTS);
  options.minify.css = defaults(options.minify.css, MINIFY_CSS_DEFAULTS);
  options.minify.html = defaults(options.minify.html, MINIFY_HTML_DEFAULTS);

  normalizePaths(options.minify.js.exclude);
  normalizePaths(options.minify.css.exclude);

  options.basePath = path.dirname(options.entryFile);
  // options.output.dir = options.output.dir;
  // options.entryFile = path.resolve('', '');

  return options;
}
function normalizePaths(pathArray){
  _.each(pathArray, function(thePath, i){
    pathArray[i] = path.normalize(thePath);
  })
}

function defaults(object, defaultOptions){
  if (object === true) {
    return defaultOptions;
  }
  else if (!object) {
    return _.each(defaultOptions, function(item, key){defaultOptions[key]=false;});
  }
  else if (_.isObject(object)) {
    return _.defaults(object, defaultOptions);
  }
}

// PARSE HTML

function getScripts(htmlString){
  var scriptElements = getTags(htmlString, 'script');
  scriptElements =  _.filter(scriptElements, function(element){
    var jsOptions = _options.minify.js;
    var result = !(isLocalJS(element.attribs) && _.contains(jsOptions.exclude, element.attribs.src));
    result = result && (jsOptions.local && isLocalJS(element.attribs)) || (jsOptions.inline && isInlineJS(element.attribs));
    return result;
  });

  //return like {local:[], inline:[], remote:[]}
  scriptElements =  _.groupBy(scriptElements, function(element){
    if (isLocalJS(element.attribs)){
      log ('\tfound js '+element.attribs.src);
      return 'local';
    }
    else if (isInlineJS(element.attribs)){
      log ('\tfound inline js '+cheerio(element).text().substr(0, 30));
      return 'inline';
    }
    else return 'other';
  });

  scriptElements.local = _.map(scriptElements.local, function(element){
    return element.attribs.src;
  });

  scriptElements.inline = _.map(scriptElements.inline, function(element){
    return cheerio(element).text();
  });

  return scriptElements;
}

//return local css files
function getStyles(htmlString){
  var styleElements = getTags(htmlString, 'link');
  styleElements =  _.filter(styleElements, function(element){
    var result = isLocalCSS(element.attribs);
    if (result) log ('\tfound css file '+element.attribs.href);
    return result;
  });
  styleElements = _.pluck(styleElements, 'attribs');

  return styleElements;
/*
  //return like {local:[], inline:[], remote:[]}
  styleElements =  _.groupBy(styleElements, function(element){
    if (isLocalCSS(element.attribs)){
      log ('\tfound js '+element.attribs.src);
      return 'local';
    }
    else if (isInlineCSS(element.attribs)){
      log ('\tfound inline css '+cheerio(element).text().substr(0, 30));
      return 'inline';
    }
    //else if (isInlineJS(element)){
      // return 'inline';
    // }
    else return 'other';
  });*/
}

function getTags(htmlString, tag){
  return cheerio.load(htmlString)(tag);
}

// CONCAT AND MINIMIZE
function concatJS(input){
  var result = '';
  if (input.local.length) {
    result = UglifyJS.minify(input.local, {
      // outSourceMap: output+".map",
      cwd:_options.basePath,
      compress:true});
    result = result.code;
  }

  if (input.inline.length){
    result = UglifyJS.minify(result+';'+input.inline.join(';'), {
      fromString: true,
      outSourceMap: path.join(_options.output.dir, _options.output.js)+".map",
      compress:true});
    result = result.code;
  }

  return result;
}

function compileStyles(input, output, onComplete) {
  concat(input, output, function() {
    if (_options.minify.css) {
      fs.readFile(output, 'utf8', function(){
        minifyStyles(output, output, onComplete);
      });
    }
    else {
      onComplete && onComplete();
    }
  });
}

function compileHTML(data){
  var $ = cheerio.load(data),
      removedJS = false,
      removedCSS = false;
  log('compiling html');

  //remove bundled js script tags
  $('script').each(function(index, element){
    if (_.contains(scriptElements.local, element.attribs.src)||
        _.contains(scriptElements.inline, element.attribs)){
        //_options.minify.js.inline && isInlineJS(element.attribs)) {
      removedJS = true;
      $(this).remove();
    }
  });

  //add bundled js script
  if (removedJS) {
    $('body').after('<script type="text/javascript" charset="utf-8" src="'+_options.output.js+'"/>');
  }

  //remove local css links
  $('link').each(function(index, element){
    if (isLocalCSS(element.attribs)) {
      removedCSS = true;
      $(this).remove();
    }
  });

  //add bundled css
  if (removedCSS) {
    $('head').append('<link rel="stylesheet" type="text/css" href="'+_options.output.css+'"/>');
  }

  var html = maybeMinifyHTML($.html());
  writeFile(path.join(_options.output.dir, _options.output.html), html, function(){
    log('done compiling html');
  });
}

function maybeMinifyHTML(html){
  if (_options.minify.html !== false){
    return cheerio.load(html, _options.minify.html).html();
  }

  return html;
}

function minifyStyles(input, output, onComplete){
  // console.log('input:'+input);
  // console.log('normalized:'+path.normalize(_options.basePath, input));
  readFile(input, function(data){
    var minifiedStyles = new CleanCSS().minify(data).styles;
    fs.writeFile(output, minifiedStyles, 'utf8', function(){
      onComplete();
    });
  })
}

// CONVENIENCE FUNCTIONS
function readFile(filename, onComplete){
  fs.readFile(filename, 'utf8', function(err, data){
    if (err) throw err;
    onComplete(data);
  });
}

function writeFile(filename, data, onComplete){
  fs.writeFile(filename, data, 'utf8', function(err, data){
    if (err) throw err;
    onComplete(data);
  });
}

String.prototype.isLocalFile = function() {
  return this.indexOf('//') === -1;
};

function isLocalJS(file) {
  var filename =  file.src ? file.src.toLowerCase() : file.length ? file.toLowerCase() : null;
  return path.extname(filename) === '.js' && filename.isLocalFile();
}

function isInlineJS(attributes) {
  return attributes.src === undefined && (attributes.type === 'text/javascript' || attributes.type === undefined);
}

function isLocalCSS(file) {
  var filename =  file.href ? file.href.toLowerCase() : file.toLowerCase();
  return path.extname(filename) === '.css' && filename.isLocalFile();
}

function log(string){
  if (VERBOSE){
    console.log(' '+string);
  }
}

function logTitle(string){
  log(chalk.bgGreen.black.bold('\n '+string.toUpperCase()));
}
