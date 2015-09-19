module.exports = {
  entryFile : 'banner/index.html',
  output : {
    dir: 'banner/build',
    html:'banner/index.html',
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
