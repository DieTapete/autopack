module.exports = {
  entryFile : 'banner/index.html',
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
  copy: ['images/**/*', 'fonts/**/*.ttf', 'font/**/*.woff', 'fonts/**/*.otf'],
  remove: ['http://localhost:35729/livereload.js']
};
