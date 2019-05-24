/**
 * @Author sugo.io<asd>
 * @Date 17-9-15
 */
const path = require('path')
const webpack = require('webpack')
const pkg = require('./package.json')
const UglifyJSPlugin = require('uglifyjs-webpack-plugin')
const ExtractTextPlugin = require('extract-text-webpack-plugin')
const _ = require('lodash')

console.log('============building version', pkg.version, '============')
const isProduction = process.env.NODE_ENV === 'production'

const definePlugin = new webpack.DefinePlugin({
  'process.env': {
    'NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    'SDK_VERSION': JSON.stringify(pkg.version)
  }
})

const uglifyJSPlugin = new UglifyJSPlugin({
  uglifyOptions: {
    compress: {
      warnings: false
    },
    output: {
      comments: false
    }
  }
})

const output = {
  path: path.resolve(__dirname, './build'),
  filename: '[name].js'
}

// web-sdk编译
let webSDKCompile = {
  entry: {
    'sugo-sdk': './src/web-sdk-entry.js'
  },
  output,
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test: /\.js?$/,
        loader: 'es3ify-loader',
        enforce: 'post'
      }
    ]
  },
  devtool: isProduction ? '' : 'source-map',
  plugins: [
    definePlugin
  ]
}

let sdkEditorCompile = {
  entry: {
    editor: './src/editor/global.js'
  },
  output,
  module: {
    loaders: [
      {
        test: /\.vue$/,
        use: [
          {
            loader: 'vue-loader',
            options: {
              extractCSS: true
            }
          },
          {
            loader: 'iview-loader',
            options: {
              prefix: true
            }
          }
        ]
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test: /\.less$/,
        loader: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [
            'css-loader',
            {
              loader: 'less-loader',
              options: {
                javascriptEnabled: true
              }
            }
          ]
        })
      },
      {
        test: /\.css$/,
        loader:  ExtractTextPlugin.extract({
          fallback: 'style-loader',
          // publicPath: '../',
          use: ['css-loader']
        })
      },
      {
        test: /\.(eot|svg|ttf|woff|woff2)(\?\S*)?$/,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 1024 * 20,
              name: 'assets/[name].[ext]?[hash]'
            }
          }
        ]
      },
      {
        test: /\.(png|jpe?g|gif|svg)(\?\S*)?$/,
        loader: 'file-loader',
        options: {
          limit: 1024 * 20,
          name: 'assets/[name].[ext]?[hash]'
        }
      }
    ]
  },
  resolve: {
    alias: {
      'vue$': 'vue/dist/vue.common.js'
    }
  },
  devtool: isProduction ? '' : 'source-map',
  plugins: [
    definePlugin,
    new ExtractTextPlugin('editor.css')
  ]
}

// 微信小程序编译
let wxMiniSDKCompile = {
  entry: {
    'wx-mini': './src/wx-mini.program.js'
  },
  output: {
    ...output,
    libraryTarget: 'commonjs2'
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/
      }
    ]
  }
}

if (isProduction) {
  // webSDKCompile.devtool = void 0
  // http://vue-loader.vuejs.org/en/workflow/production.html
  webSDKCompile.plugins = (webSDKCompile.plugins || []).concat(
    new UglifyJSPlugin({
      uglifyOptions: {
        compress: {
          warnings: false,
          properties: false,
          computed_props: false
        },
        ie8: true,
        keep_fnames: true,
        comments: /^\/\*!/
      }
    })
  )

  sdkEditorCompile.plugins = (sdkEditorCompile.plugins || []).concat(uglifyJSPlugin)

  // wxMiniSDKCompile.devtool = void 0
  wxMiniSDKCompile.plugins = (wxMiniSDKCompile.plugins || []).concat(uglifyJSPlugin)
}

// web sdk打包分离vuejs（使用时需单独引入vuejs）
const sdkEditorLiteCompile = _.clone(sdkEditorCompile)
sdkEditorLiteCompile.entry = {
  'editor-lite': './src/editor/global.js'
}
sdkEditorLiteCompile.externals = {
  vue: 'Vue' 
  // iview: 'iview'
  // 'element-ui': 'ELEMENT'
}

module.exports = [
  webSDKCompile,
  sdkEditorCompile,
  sdkEditorLiteCompile,
  wxMiniSDKCompile
]
