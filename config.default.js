/**
 * @typedef {Object} SugoIOSDKJSConfig
 * @property {boolean} debug
 * @property {string} encode_type
 * @property {string} api_host
 * @property {string} app_host
 * @property {string} decide_host
 * @property {string} namespace
 * @property {loaded} dimensions
 */
module.exports = {

  debug: false,

  encode_type: 'plain',// 默认json以前的方式 plain=新的数据包模式

  //for /track /engage 数据上报
  api_host: 'collect.sugo.io',

  //for media 静态资源
  app_host: 'localhost:8080',

  enable_hash: false,

  //可视化埋点
  decide_host: 'localhost:8080',

  // 插件所属命名空间,在install的时候会传入
  namespace: ''
}
