# README

texts and other settings can be set in the index.html settings object. some texts are also set directly in the html code.

## to generate image maps:
- you need to have glue installed: http://glue.readthedocs.org/en/latest/
- put the images into the items subfolders and run `npm run build:images`

## development mode
- during development run `npm run dev`
- open a browser with the address http://localhost:9090
- requirements: node (http://nodejs.org/), npm (http://npmjs.com/)

 ## build
 to pack everything together run
 `node ./node_modules/autopack/bin/autopack.js`
 you can configure how much you want to pack in autopackfile.js
 make sure to also copy images, fonts by hand
