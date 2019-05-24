/**
 * @Author sugo.io<asd>
 * @Date 17-11-10
 */

const CONSTANTS = require('./constants')
const DefConf = require('./config.default')
const fs = require('fs')
const path = require('path')

const namespace = 'sugo-sdk-js'

/**
 * 需要扩展到应用的资源
 * @typedef {Object} SugoIOExtensionExtract
 * @property {Array<{path:string, file:string}>} [assets]       - 静态资源文件或目录
 */

/**
 * @typedef {function} SugoIOExtension
 * @param {Koa} app
 * @param {Router} router
 * @param {Object<string, Sequelize>} database
 * @param {Object} config
 * @param {Object<string, Object>} dependencies
 * @return {Promise<SugoIOExtensionExtract>}
 */

/**
 * @function {SugoIOExtension}
 * 安装过程是将 SugoIO/config.js 中的`websdk_api_host`, `websdk_app_host`以及`websdk_decide_host`
 * 写入到已发布的 ./libs/sugoio-latest.min.js 中。
 * 由于url的复制性造成替换正则难以书写，且为全局多次替换，极易出错。
 * 所以直接将配置写入到源代码最前面，以保证在sdk所有代码之前写入配置。
 */
function install(app, router, database, config, dependencies) {
  return new Promise((resolve, reject) => {
    let conf
    try {
      conf = require(path.join(__dirname, './config.js'))
    } catch (e) {
      conf = {}
      console.log(`${namespace} no custom config`)
    } finally {
      // 合并 config,优先级为 config.default < config.js < config
      conf = Object.assign(DefConf, conf, { namespace })
    }

    // 提取sugoio配置,写入到本地config中
    const hostsKeys = ['api_host', 'app_host', 'decide_host', 'enable_geo_track', 'duration_track', 'enable_hash', 'js_cdn', 'heatmap', 'heatmap_grid_track']

    hostsKeys.forEach((key) => {
      const ck = 'websdk_' + key
      if (config[ck]) {
        conf[key] = config[ck]
      }
    })

    const injectScript = `
    (function(){
      var INJECT_CONFIG = ${JSON.stringify(conf)};
      var SugoIO = window['${CONSTANTS.PRIMARY_INSTANCE_NAME}'] || (window['${CONSTANTS.PRIMARY_INSTANCE_NAME}'] = {});
      SugoIO['${CONSTANTS.INJECT_CONFIG_PROP_KEY}'] = INJECT_CONFIG;
    })();
    `
    const rBuf = path.join(__dirname, './libs/sugoio-latest.min.buf.js')
    const wBuf = path.join(__dirname, './libs/sugoio-latest.min.js')
    let reader = fs.createReadStream(rBuf)
    let writer = fs.createWriteStream(wBuf)

    writer.write(injectScript)
    reader.pipe(writer)

    writer.on('finish', () => {
      console.log(`--------------${namespace} installed---------------`)
      // 静态资源可能会放在CDN,所以不能使用动态的 namespace
      // 这会造成每次服务重器时url都发生变化
      // 进而造成CDN缓存失效
      resolve({ assets: [] })
    })

    writer.on('error', (err) => {
      reject(err.message)
    })
  })
}

module.exports = {
  install,
  namespace
}
