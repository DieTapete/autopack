var fs = require('fs');
var path = require('path');

var tildify = require('tildify');
var loop = require('serial-loop');
var _ = require('underscore');
var cheerio = require('cheerio');
var concat = require('concat-files');
var UglifyJS = require("uglify-js");
var CleanCSS = require('clean-css');
var chalk = require('chalk');
var copy = require('copy-files');
var glob = require("glob");
var mkdirp = require('mkdirp');
var beautifyHTML = require('js-beautify').html;

const  PACK_JS_DEFAULTS = {
  inline: {concat: false, minify:false},
  local: {concat: true, minify:true},
  remote: false, //NOT SUPPORTED YET
  exclude:[],
  append: 'body',
  name:'bundle.js'
};
const  PACK_CSS_DEFAULTS = {
  inline: {concat: false, minify:true},
  local: {concat: true, minify:true},
  remote: false, //NOT SUPPORTED YET
  exclude:[],
  append: 'head',
  name:'style.css'
};
const  PACK_HTML_DEFAULTS = {
  minify:false,
  name:'index.html',
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
  mkdirp(_options.output, function(err){
    if (err) throw err;
    log('creating dir '+_options.output+' if not alreay created.');
    var numSubDirectories = 0, numCreatedSubDirectories = 0;
    _.each(_options.output, function(target){
      if (target != _options.output){
        var directory = path.dirname(target);
        if (directory != '.') {
          log('Creating directory '+directory+' in output directory.');
          numSubDirectories++;
          mkdirp(path.join(_options.output, directory), function(){
            numCreatedSubDirectories++;
            //All directories created.
            if(numCreatedSubDirectories == numSubDirectories){
              log('sub directories created.');
            }
          });
        }
      }
    });
    log('Opening Entry File '+path.basename(_options.entry));
    readFile(path.basename(_options.entry), function(htmlString){
      htmlString = remove(htmlString);
      compile(htmlString);
    });
    copyFiles();
  });
};

process.on('exit', function(code) {
  try {
    process.chdir(originalCWD);
    if (code === 0){
      log(chalk.bgGreen.black.bold('\n Finished. You find your files neatly packed together in "'+tildify(path.join(process.cwd(), _options.output))+'".'));
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
    glob(copyEntry, {ignore:_options.output}, function (err, files) {
      if (err) {
        console.error(err);
      }
      else {
        if (files.length>0) {
          _.each(files, function(file){
            log('trying to copy file '+file);
            var targetFile = path.join(_options.output, file);
            if (fs.lstatSync(file).isFile()) {
              mkdirp(path.dirname(targetFile), function (err) {
                  if (err) console.error(err);
                  else {
                    fs.createReadStream(file).pipe(fs.createWriteStream(targetFile));
                  }
              });
            } else {
              log(chalk.bgYellow.black(targetFile +' is a directory. skipping.'));
            }
          });
        }
      }
    });
  });
}

function remove(htmlString){
  logTitle('removing references');
  var $ = cheerio.load(htmlString);
  _.each(_options.remove, function(element){
    log('Searching for element '+element);
    var $element = findElementBySelectorOrFilename($, element);
    if ($element) {
      log('Element '+element+' found. Removing...');
      $element.remove();
    }
  });

  return $.html();
}

function compile(htmlString) {
  logTitle('processing files');

  processJS(htmlString);
  processCSS(htmlString);

  compileHTML(htmlString);
}

function processJS(htmlString){
  log('processing js..');
  scriptElements = getScripts(htmlString);
  var jsOptions = _options.pack.js;

  var jsString = '';
  var concatAll = jsOptions.local.concat && jsOptions.inline.concat;
  var minifyAll = jsOptions.local.minify && jsOptions.inline.minify;
  if (concatAll && minifyAll){
    jsString = minifyScripts(concatSync(scriptElements.local, ';')+';'+scriptElements.inline.join(';'));
  }
  else if (concatAll && !minifyAll){
    var localJS = concatSync(scriptElements.local,';');
    var inlineJS = scriptElements.inline.join(';');
    if (jsOptions.local.minify){
      localJS = minifyScripts(localJS);
    }
    if (jsOptions.inline.minify){
      inlineJS = minifyScripts(inlineJS);
    }

    jsString = localJS+';'+inlineJS;
  }
  else if (!concatAll) {
    if (jsOptions.local.concat){
      jsString = concatSync(scriptElements.local,';');
      if (jsOptions.local.minify){
        jsString = minifyScripts(jsString);
      }
    }
    if (jsOptions.inline.minify){
      //todo
    }
  }

  if (jsString.length>1){
    var bundleFile = path.join(_options.output, _options.pack.js.name);
    writeFile(bundleFile, jsString, function(){
      log('done processing js');
    });
  }
}

//processStyles(, path.join(_options.output, _options.pack.css.name), function(){
function processCSS(htmlString){
  log('processing css..');
  styleElements = getStyles(htmlString);
  var cssOptions = _options.pack.css;

  var cssString = '';
  var concatAll = cssOptions.local.concat && cssOptions.inline.concat;
  var minifyAll = cssOptions.local.minify && cssOptions.inline.minify;
  var localCSS = concatSync(_.pluck(styleElements.local, 'href'));

  if (concatAll) {
    var inlineCSS = styleElements.inline.join(' ');
    if (minifyAll) {
      cssString = minifyStyles(localCSS+inlineCSS);
    }
    else {
      if (cssOptions.local.minify){
        localCSS = minifyStyles(localCSS);
      }
      if (cssOptions.inline.minify){
        inlineCSS = minifyScripts(inlineCSS);
      }
      cssString = localCSS+inlineCSS;
    }
  }
  else if (!concatAll) {
    if (cssOptions.local.concat){
      cssString = localCSS;
      if (cssOptions.local.minify){
        cssString = minifyStyles(cssString);
      }
    }
    if (cssOptions.inline.minify){
      //todo
    }
  }

  if (cssString.length>1){
    var bundleFile = path.join(_options.output, _options.pack.css.name);
    writeFile(bundleFile, cssString, function(){
      log('done processing css');
    });
  }
}


function sanitizeOptions(options) {
  options.pack = options.pack || options.minify;
  options.entry = options.entry || options.entryFile;

  options.pack.js = defaults(options.pack.js, PACK_JS_DEFAULTS);
  options.pack.css = defaults(options.pack.css, PACK_CSS_DEFAULTS);
  options.pack.html = defaults(options.pack.html, PACK_HTML_DEFAULTS);

  normalizePaths(options.pack.js.exclude);
  normalizePaths(options.pack.css.exclude);

  options.basePath = path.dirname(options.entry);
  options.remove = options.remove || [];
  options.copy = options.copy || [];

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

function getScripts(htmlString){
  var jsOptions = _options.pack.js;
  var $ = cheerio.load(htmlString);
  _.each(jsOptions.exclude, function(itemToExclude){
    var $itemToExclude = findElementBySelectorOrFilename($, itemToExclude);
    if ($itemToExclude) {
      $itemToExclude.remove();
    }
  });
  htmlString = $.html();
  var scriptElements = getTags(htmlString, 'script');
  scriptElements =  _.filter(scriptElements, function(element){
    var result = isLocalJS(element.attribs);
    result = result && (jsOptions.local.concat && isLocalJS(element.attribs)) || (jsOptions.inline.concat && isInlineJS(element.attribs));
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
  var result  = {};
  var localCSS = getTags(htmlString, 'link');
  localCSS =  _.filter(localCSS, function(element){
    var result = isLocalCSS(element.attribs);
    if (result) log ('\tfound css file '+element.attribs.href);
    return result;
  });
  localCSS = _.pluck(localCSS, 'attribs');
  result.local = localCSS;

  result.inline = getTags(htmlString, 'style');
  result.inline = _.map(result.inline, function(element){
    return cheerio(element).text();
  });

  return result;
}

function getTags(htmlString, tag){
  return cheerio.load(htmlString)(tag);
}

// CONCAT AND MINIFY
function concatJS(input){
  var result = '';
  if (input.local.length) {
    result = concatSync(input.local)+' ';
  }
  if (input.inline.length){
    result += input.inline.join(' ');
  }

  if (_options.pack.js.minify) {
    result = UglifyJS.minify(input.local, {
        // outSourceMap: output+".map",
        cwd:_options.basePath,
        compress:true
      });
    result = result.code;
  }

  return result;
}

function concatCSS(input){
  concat(input, output, function() {
    if (_options.pack.css.minify) {
      fs.readFile(output, 'utf8', function(){
        minifyStyles(output, output, onComplete);
      });
    }
    else {
      onComplete && onComplete();
    }
  });
}

//concat css and minify it if specified
function processStyles(input, output, onComplete) {
  concat(input, output, function() {
    if (_options.pack.css.minify) {
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
    if (_.contains(scriptElements.local, element.attribs.src) ||
        _.contains(scriptElements.inline, element.attribs)){
        //_options.pack.js.inline && isInlineJS(element.attribs)) {
      removedJS = true;
      $(this).remove();
    }
  });

  //add bundled js script
  if (removedJS) {
    var $jsParent = $(_options.pack.js.append);
    if ($jsParent.length == 1){
      $jsParent.append('<script type="text/javascript" charset="utf-8" src="'+_options.pack.js.name+'"/>');
    }
    else {
      console.error("Can't append JS to "+_options.pack.js.append+'. No distinct item found.')
    }
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
    var $cssParent = $(_options.pack.css.append);
    if ($cssParent.length == 1){
      $cssParent.append('<link rel="stylesheet" type="text/css" href="'+_options.pack.css.name+'"/>');
    }
    else {
      console.error("Can't append CSS to "+_options.pack.css.append+'. No distinct item found.')
    }
  }

  var html = maybeMinifyHTML(beautifyHTML($.html(), {preserve_newlines:false}));
  writeFile(path.join(_options.output, _options.pack.html.name), html, function(){
    log('done compiling html');
  });
}

function maybeMinifyHTML(html){
  if (_options.pack.html.minify !== false){
    return cheerio.load(html, _options.pack.html).html();
  }

  return html;
}

function minifyScripts(jsString){
  var result = UglifyJS.minify(jsString, {
      // outSourceMap: output+".map",
      fromString:true,
      cwd:_options.basePath,
      compress:true
    });
  return result.code;
}

function minifyStyles(input){
  return new CleanCSS().minify(input).styles;

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

function findElementBySelectorOrFilename($, selectorOrFilename){
  var $element;
  try {
    $element = $(selectorOrFilename);
  }
  catch(err) {
      try {
        $element = $('[src="'+selectorOrFilename+'"]');
      }
      catch(err){
        console.error('Couldnt find element '+selectorOrFilename+'.');
      }
  }

  if ($element && $element.length>0){
    return $element;
  }

  return null;
}

function concatSync(files, separator) {
  separator = separator || ' ';
  var str = separator;
  for (var i=0; i< files.length; i++){
    var buffer = fs.readFileSync(files[i], 'utf8');
    str += buffer+separator;
  }
  return str;
}

function log(string){
  if (VERBOSE){
    console.log(' '+string);
  }
}

function logTitle(string){
  log(chalk.bgBlue.black.bold('\n '+string.toUpperCase()));
}
