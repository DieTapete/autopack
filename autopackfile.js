module.exports = {
  entryFile : 'banner/index.html',
  output : {
    dir: 'build',
    html:'index.html',
    css:'styles.min.css',
    js:'app.min.js'
  },
  minify:{
    html:true,
    css: true,
    js: true
  },
  copy: ['**/*.png', '**/*.jpg', '**/*.gif', '**/*.ttf', '**/*.woff', '**/*.otf']
};
