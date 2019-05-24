var Request = require('./sugoio-request')
var _ = require('./utils')._
var CONFIG = require('./config')
var Logger = require('./logger').get()
var request = require('./request')

function concat () {
  var arr = _.toArray(arguments)
  return arr.join('')
}

function set_host (host) {
  return /^https?/.test(host) ? host : document.location.protocol + '//' + host
}

module.exports = {

  // 如果app_host中没有配置协议，则默认使用当前页面的协议
  host: set_host(CONFIG.app_host),

  /**
   * 更新host
   * @param {string} host
   */
  set_host: function (host) {
    this.host = set_host(host)
  },

  serialize: function (params) {
    Logger.debug('Before serialize params: %o', params)
    return _.JSONEncode({ q: _.compressUrlQuery(params) })
  },

  queryString: function (params) {
    Logger.debug('Before compress params: %o', params)
    return 'q=' + _.compressUrlQuery(params)
  },

  list: function (params) {
    return request().send('GET', concat(this.host, '/api/sdk/desktop/vtrack-events-draft?', this.queryString(params)))
  },

  create: function (params) {
    return Request.post(concat(this.host, '/api/sdk/desktop/vtrack-events-draft/create'), this.serialize(params))
  },

  delete: function (params) {
    return Request['delete'](concat(this.host, '/api/sdk/desktop/vtrack-events-draft/delete?', this.queryString(params)))
  },

  //部署可视化配置（将草稿表记录发布到正式表)
  deploy: function (params) {
    return Request.post(concat(this.host, '/api/sdk/desktop/vtrack-events/deploy'), this.serialize(params))
  },
  // 保存页面参数设置
  savePageInfo: function (params) {
    return Request.post(concat(this.host, '/api/sdk/desktop/save-page-info'), this.serialize(params))
  },

  /**
   * 项目项目所有维度
   * @param {String} token
   * @return {Object}
   */
  dimensions: function (token) {
    return Request.post(concat(this.host, '/api/sdk/desktop/dimensions'), _.JSONEncode({ token: token }))
  },

  /**
   * 保存、更新页面分类记录
   * @param {Array<PageCateGoryDesc>} models
   * @param {String} token
   * @param {String} app_version
   */
  savePageCategories: function (models, token, app_version) {
    return Request.post(concat(this.host, '/api/sdk/desktop/page-categories/save'), _.JSONEncode({
      models: models,
      token: token,
      app_version: app_version
    }))
  },

  /**
   * 获取所有页面分类
   * @param {String} appid
   * @param {String} app_version
   */
  getPageCategories: function (appid, app_version) {
    return Request.get(concat(this.host, '/api/sdk/desktop/page-categories?', this.queryString({ appid: appid, app_version: app_version })))
  },

  /**
   * 获取已部署所有页面分类
   * @param {String} appid
   * @param {String} app_version
   */
  getDeployedPageCategories: function (appid, app_version) {
    return request().send('GET', concat(this.host, '/api/sdk/desktop/page-categories-deployed?', this.queryString({ appid: appid, app_version: app_version })))
  },

  /**
   * 查询appid所属的所有页面信息记录
   * @param {string} appid
   * @param {string} app_version
   * @param {boolean} deployed   - 是否获取已部署的页面分类
   */
  getAllPageInfo: function (appid, app_version, deployed) {
    return request().send('GET', concat(
      this.host,
      '/api/sdk/desktop/page-info-list' + (deployed ? '-deployed?' : '?'),
      this.queryString({ appid: appid, app_version: app_version }))
    )
  },

  /**
   * @typedef {Object} GetFirstLoginTimeResponseStruct
   * @property {boolean} success
   * @property {{firstLoginTime:number, isFirstLogin: boolean}} result
   * @property {string} message
   * @property {number} code
   * @property {string} type
   */
  /**
   * 查询用户登录状态
   * @param user_id
   * @param token
   * @return {RequestHooksStruct}
   */
  getFirstLoginTime: function (user_id, token) {
    return request().send('GET', concat(this.host, '/api/sdk/desktop/get-first-login-time?userId=', user_id + '&token=' + token))
  }
}
