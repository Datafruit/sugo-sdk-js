/**
 * @Author sugo.io<asd>
 * @Date 17-8-19
 * @description
 * 改版后页面事件规则变得复杂，具体规则如下
 * 设：
 * `url = location.origin + location.pathname`
 *
 * ## 页面配置信息变化
 * 1. `page` 存的值由`location.pathname`变为`url`。
 * 2. 新增`category`字段
 *
 * ## 事件来源变化
 * 1. 查询`appid`下的所有`PageConfDesc`，得到集合`S(p)`
 * 2. 建立集合`P`，使用`S(p)`的`category`去匹配`url`，匹配成功，则将记录`page`属性添加到`P`。
 *    兼容旧数据：
 *    旧数据中没有`category`，使`category = '*' + page`
 * 3. 使用页面`P`集合查询所有事件，匹配条件为`EventDesc.page in P`
 *
 * @see {PageConfDesc}
 * @see {EventDesc}
 *
 */

var _ = require('./utils')._
var API = require('./sugo-event-api')
var Regulation = require('./regulation-parser')
var Logger = require('./logger').get()

/**
 * @param {Array<PageConfDesc>} list
 * @param {string} url
 * @param {string} path
 * @return {Array<string>}
 */
function matcher (list, url, path) {

  list = _.map(list, function (r) {
    if (!r.category) {
      r.category = '*' + r.page
    }
    return r
  })

  // 2.匹配page
  // 兼容旧版数据：
  // 旧的数据中没有category字段，默认使用'*' + page为其category

  // 获取与当前页面兼容的页面配置
  var regulations = Regulation.match(url, _.map(list, function (r) {
    return r.category
  }))

  // 事件来源：
  // 1. url下的所有事件
  // 2. 页面category能匹配当前url的所有页面
  var path_name = [url, path]

  _.each(list, function (r) {
    if (_.indexOf(regulations, r.category) !== -1) {
      path_name.push(r.page)
    }
  })

  return _.uniq(path_name)
}

/**
 * @param {String} host
 * @param {String} token
 * @param {String} url
 * @param {String} path
 * @param {boolean} deployed
 * @param {Function} callback
 */
module.exports = function (host, token, url, path, deployed, callback) {

  // 配置 host
  API.host = host

  // 查询 token 下的所有PageConfDesc
  API.getAllPageInfo(token, '0', deployed).success(function (res) {

    if (!res.success) {
      Logger.error('get all page info error: %s', res.message)
      callback(res.message)
    }

    callback(null, matcher(res.result || [], url, path), res.result)
  })
}

module.exports.matcher = matcher
