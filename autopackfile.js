module.exports = { entry: 'index.html',
  output: 'build',
  pack:
   { html: { name: 'index.html', minify: false },
     css:
      { name: 'style.css',
        local: { concat: true, minify: true },
        inline: { concat: false, minify: true },
        exclude: [],
        append: 'head' },
     js:
      { name: 'bundle.js',
        local: { concat: true, minify: true },
        inline: { concat: false, minify: true },
        exclude: [],
        append: 'body' } },
  copy: [],
  remove: [] }
