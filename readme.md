# AutoPack
AutoPack runs through all the JavaScript and CSS references in your HTML file and spits out an HTML file that only loads one bundled and minimized .css and .js file.

Still in heavy development. Please file any bugs you find and/or contribute.

## Usage

#### 1. API usage (i.e. in a build process)
Install the package via npm:
```sh
$ npm install autopack --savedev
```
Require it in your build file.
```js
var autopack = require('autopack');
```
Call the autopack function with options.
```js
autopack({ input: "dev/index.html",
          output: "build/index.html" });
```

#### 1. Command Line usage
Install the package globally:
```sh
$ npm install -g autopack
```
~~Optionally create a configuration file in your current working directory~~
Not implemented yet, for now you have to create `autopackfile.js` yourself.
```sh
$ autopack config
```

Run `autopack`
```sh
$ autopack -i index.html -o build/index.html
```

## CLI Flags
Run `autopack` in your console with the following flags.

Flag              | Description
------------------|---------------------------------------------------------------
`-i`, `--input` | The HTML file you want autopacker to work on.
`-o`, `--output`| The directory you want autopacker to save the converted files to.


## Configuration
You can configure autopack by creating a file named autopack.js in the root directory of your project. The default configuration looks like this:

```js
{
  minify:{
    html: true, //set to true if you want to minimize the resulting html
    javascript: { //either set to true to use the defaults or use an object
      local: true, //concat and minimize references to local files
      inline; true, //concat and minimize references to inline javascript
      //the following options are planned but not yet implemented
      remote: false //concat and minimize references to remote files
      exclude: [] // enter filenames, urls or script tag ids you want to exclude from minification
    },
    css: {
      local: true, //concat and minimize references to local files
      inline; true, //concat and minimize references to inline css
      //the following options are planned but not yet implemented
      remote: false //concat and minimize references to remote files
      exclude: [] // enter filenames, urls or link tag ids you want to exclude from minification
    }
  },
  //these files will be copied into the target directory
  //not yet implemented
  copy: ['**/*.png', '**/*.jpg', '**/*.gif', '**/*.ttf', '**/*.woff', '**/*.otf']
}
```

Example config file
```js
module.exports = {
  entryFile : 'index.html',
  output : {
    dir: 'build',
    html:'index.html',
    css:'styles.css',
    js:'banner.js',
    zip:'%DATE%_deploy.zip'
  },
  concat:{
    css:true,
    js:{
      exclude: ['scripts/banner.js']
    }
  }
  minify:{
    html:false,
    css: true,
    js: {
      local:true,
      exclude:['scripts/banner.js', '#myspecialinlinescript']
    }
  },
  copy: ['**/*.png', '**/*.jpg', '**/*.gif', '**/*.ttf', '**/*.woff', '**/*.otf'],
  //These resources will be removed from the html code
  // not yet implemented
  remove:['http://localhost:35729/livereload.js', '#dev-info', 'debug.css']
};
```
