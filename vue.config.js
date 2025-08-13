module.exports = {
  transpileDependencies: ['chartjs-plugin-zoom'],
  
  // 设置页面标题
  pages: {
    index: {
      entry: 'src/main.js',
      title: 'Visualizer',
    },
  },

  chainWebpack: config => {
    config.module
      .rule('vue')
      .use('vue-loader')
      .tap(options => {
        options.compiler = require('vue-template-babel-compiler')
        return options
      })
  }
}
