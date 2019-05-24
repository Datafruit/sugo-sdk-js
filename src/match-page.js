/**
 * @Author sugo.io<asd>
 * @Date 17-8-28
 * @description 确定页面信息
 * 如果当前页面匹配多条页面信息记录
 * 1. 设url = location.origin + location.pathname
 * 2. 优先匹配page === url的记录，如果没有匹配到，则最最后一次更新的记录
 */

var _ = require('./utils')._
var Regulation = require('./regulation-parser')
var Logger = require('./logger').get()

/**
 * @param {String} url
 * @param {Array<PageConfDesc>} list
 * @return {?PageConfDesc}
 */
module.exports = function (url, list) {
  // 页面设置改为可动态匹配（支持*通配符)
  const regulations = _.map(list, function (r) {
    // 兼容旧版数据：
    // 旧的数据中没有category字段，默认使用'*' + page为其category
    if (!r.category) {
      r.category = '*' + r.page
    }
    return r.category
  })
  let pageInfo
  const matched = Regulation.exec(url, regulations)
  if (matched) {
    // 优先匹配当前页面设置
    pageInfo = _.find(list, (r) => r.category === matched && r.page === url)
    // 未设置特殊名称，优先匹配第一条符合规则记录
    if (!pageInfo) {
      pageInfo = _.find(list, r => r.category === matched)
    }
  }
  Logger.info('Matched page config %o', pageInfo)
  return pageInfo

  /************ older */

  // const conf = _.find(list, r => {
  //   return r.page === url
  // })

  // Logger.info('Matched page config %o', conf)
  // return conf

  /**************deprecated*******/
  // if (conf) {
  //   Logger.info('Matched page config %o', conf)
  //   return conf
  // }

  // conf = list.sort(function (a, b) {
  //   return new Date(a.changed_on) - new Date(b.changed_on)
  // })

  // var result = conf[0] || null
  // Logger.info('Matched page config %o', result)
  // return result
}
