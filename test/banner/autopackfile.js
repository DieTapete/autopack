module.exports = {
  entryFile : 'index.html',
  output : {
    dir: 'build',
    html:'index.html',
    css:'styles/styles.css',
    js:'banner.js'
  },
  minify:{
    html:false,
    css: true,
    js: {
      inline:false,
      local:true,
      exclude:[]
    }
  },
  copy: ['**/*.png', '**/*.jpg', '**/*.gif', '**/*.ttf', '**/*.woff', '**/*.otf']
};
