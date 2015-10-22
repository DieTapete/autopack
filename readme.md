# AutoPack
#### Get your scripts together
AutoPack runs through all the JavaScript and CSS references in your HTML file and spits out an HTML file that only loads one bundled and minimized .css and .js file. It also copies other files you specify into your build directory. Everything is configurable; AutoPack can also do nothing at all if you want it to.

__AutoPack is still in heavy development. Please file any bugs you find and/or contribute.__

## Usage

#### Command Line usage
1. Install the package globally:
```sh
$ npm install -g autopack
```
3. CD to your projects directory and create a configuration file.
```sh
$ cd my_project
$ autopack init
```

3. Run `autopack`
```sh
$ autopack
```

#### CLI Flags
Run `autopack` in your console with the following optional flags.

Flag                        | Description
----------------------------|---------------------------------------------------------
`--autopackfile`, `--config`| Specify the location of the autopackfile.
`--cwd`                     | Change the current working directory.
`-i`, `--input`             | The HTML file you want AutoPack to work on.
`-o`, `--output`            | The directory you want AutoPack to save the converted files to.

#### CLI Commands
Command                     | Description
----------------------------|---------------------------------------------------------
`init`                      | Create an autopackfile in the current directory.





#### API usage (i.e. in a build process) Needs further testing
<del>
Install the package via npm:
```sh
$ npm install autopack --savedev
```
Require it in your build file.
```js
var autopack = require('autopack');
```
Call the `autopack` function with options.
```js
autopack({ input: "dev/index.html",
          output: "build/index.html" });
```
</del>

## Configuration
You can configure AutoPack by creating a file named autopackfile.js in the root directory of your project. The default configuration looks like this:

```js
{
  pack:{
    html: {
      name: 'index.html', //name of the resulting html file, will be same as entry file if omitted
      minify: false //set to true if you want to minify the resulting html
    },
    js: { //either set to true to use the defaults or use an object
      name: 'bundle.js', //name of the resulting concatenated javascript
      local: {
        concat:true, //add local javascript file references to the bundled file
        minify:true  //minify local javascript files
      },
      inline: {
        concat:false, //add inline javascript to the bundled file
        minify:false  //minify inline javascript
      },
      exclude: [] // filenames, urls or dom-selectors of elements you want to exclude from the process,
      append: 'body' // selector of element where you want to append the bundle script tag to
    },
    css: { //either set to true to use the defaults or use an object
      name: 'style.css', //name of the resulting concatenated css
      local: {
        concat:true, //add local css file references to the bundled file
        minify:true  //minify local css files
      },
      inline: {
        concat:false, //add inline css to the bundled file
        minify:false  //minify inline css
      },
      append: 'head' // selector of element where you want to append the bundle css tag to
      exclude: [] // filenames, urls or dom-selectors of elements you want to exclude from the process
    },

  },
  copy: [], //files found under these patterns will be copied into the output directory
  remove: [] // filenames, urls or dom-selectors of elements you want to remove from the resulting html
}
```

Example autopackfile
```js
module.exports = {
  entry: 'index.html',
  output: 'build',
  pack:{
    html:{
      name: 'index.html',
      minify: false
    },
    css:{
      name: 'style.css',
      local: { concat: true, minify: true },
      inline: { concat: false, minify: true },
      exclude: [],
      append: 'head'
    },
    js:{
      name: 'bundle.js',
      local: { concat: true, minify: true },
      inline: { concat: false, minify: true },
      exclude: ['scripts/settings.js'],
      append: 'body'
    }
  },
  //files found under these patterns will be copied into the output dir
  copy: ['images/**', '**/*.gif', 'fonts/*.ttf', 'fonts/*.woff', 'fonts/*.otf'],
  //These resources/elements will be removed from the html code
  remove:['http://localhost:35729/livereload.js', '#dev-info', 'debug.css']
};
```

## Known Issues
AutoPack is still a work in progress. Don't expect it to work rightaway in your project. If you find any issues please report them.

#### Script dependency
AutoPack can alter the order in which scripts are executed if for example only local scripts are being concatenated. This can result in problems with dependencies in inline scripts. Consider the following scenario:
```js
//settings.js
mySettings = {background:'#fff'};
```
```js
//main.js
function start(){
  console.log(mySettings.background);
}
```

```html
<script src="settings.js"/>
<script> mySettings.background = '#000'; </script>
<script src="main.js"/>
```
The packed version can result in the following HTML:
```html
<script> mySettings.background = '#000'; </script>
<script src="bundle.js"/>
```
Now the inline script is not able to find the variable `mySettings` (which is being set in `settings.js`). To get rid of problems like this either append the resulting JavaScript file before the inline script or add additional logic to run the script after everything is loaded:

```html
<script src="settings.js">
<script>
window.onload = function(){ mySettings.background = '#000'; start(); }
</script>
<script src="main.js">
```
