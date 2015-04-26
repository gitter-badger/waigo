gulp = require 'gulp'
nodemon = require 'gulp-nodemon'


module.exports = (paths, options = {}) ->
  return {
    deps: ['assets']
    task: ->
      options.dontExitOnError = true

      gulp.watch paths.assets.src.img_watchFiles, ['img']
      gulp.watch paths.assets.src.stylus_watchFiles, ['stylus']
      gulp.watch paths.assets.src.js_watchFiles, ['js']

      nodemon({ 
        script: 'start-app.js'
        ext: 'js'
        ignore: [
          'docs/*'
          'bin/*'
          'public/*'
          'node_modules/*'
          'test/*'
          'src/cli/*'
          'src/assets/*'
        ]
      })
  }

