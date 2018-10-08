/**
 * @Author sugo.io<asd>
 * @Date 17-9-15
 */
const path = require('path')
const webpack = require('webpack')
const pkg = require('./package.json')
const UglifyJSPlugin = require('uglifyjs-webpack-plugin')
const _ = require('lodash')

console.log('============building version', pkg.version, '============')
const isProduction = process.env.NODE_ENV === 'production'

const output = {
  path: path.resolve(__dirname, './build'),
  filename: '[name].js'
}

// web-sdk编译
let webSDKCompile = {
  entry: {
    'sugo-sdk': './src/loader-globals.js'
  },
  output,
  module: {
    loaders: [
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        exclude: /node_modules/
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        loader: 'style-loader!css-loader'
      },
      {
        test: /\.(eot|svg|ttf|woff|woff2)(\?\S*)?$/,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 1024 * 20,
              name: '[name].[ext]?[hash]'
            }
          }
        ]
      },
      {
        test: /\.(png|jpe?g|gif|svg)(\?\S*)?$/,
        loader: 'file-loader',
        options: {
          limit: 1024 * 20,
          name: '[name].[ext]?[hash]'
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
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify(process.env.NODE_ENV),
        'SDK_VERSION': JSON.stringify(pkg.version)
      }
    })
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

  // wxMiniSDKCompile.devtool = void 0
  wxMiniSDKCompile.plugins = (wxMiniSDKCompile.plugins || []).concat(
    new UglifyJSPlugin({
      uglifyOptions: {
        compress: {
          warnings: false
        },
        output: {
          comments: false
        }
      }
    })
  )
}

module.exports = [
  webSDKCompile,
  wxMiniSDKCompile
]
