/**
 * @Author sugo.io<asd>
 * @Date 17-8-28
 * @description 确定页面信息
 * 如果当前页面匹配多条页面信息记录
 * 1. 设url = location.origin + location.pathname
 * 2. 优先匹配page === url的记录，如果没有匹配到，则最最后一次更新的记录
 */

var _ = require('./utils')._
var Logger = require('./logger').get()

/**
 * @param {String} url
 * @param {Array<PageConfDesc>} list
 * @return {?PageConfDesc}
 */
module.exports = function (url, list) {
  const conf = _.find(list, r => {
    return r.page === url
  })

  Logger.info('Matched page config %o', conf)
  return conf
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

