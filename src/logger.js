/**
 * @Author sugo.io<asd>
 * @Date 17-10-30
 */

/** @type {SugoIOSDKJSConfig} */
var Conf = require('./config')
var Utils = require('sugo-sdk-js-utils')['default']
var LoggerMap = {}
var DEFAULT_NAMESPACE = 'Sugoio.SDK'
// 开放一个debug隐藏参数,以便调试
// 因为search以?开头,所以indexOf一定大于0
var URLQuery = window.location.search.indexOf('sugoio_debug=true') > 0

module.exports = {
  /**
   * @param {string} [namespace]
   * @return {Utils.Logger}
   */
  get: function (namespace) {
    namespace = namespace || DEFAULT_NAMESPACE

    if (LoggerMap.hasOwnProperty(namespace)) {
      return LoggerMap[namespace]
    }

    var logger = new (Utils.Logger)(namespace)

    // 如果开启了debug或者开发环境下,输出全部日志信息
    if (Conf.debug || URLQuery || process.env.NODE_ENV === 'development') {
      logger.setLevel(Utils.LoggerLevel.DEBUG)
    } else {
      // 生产环境只输出error级别信息
      logger.setLevel(Utils.LoggerLevel.ERROR)
    }

    LoggerMap[namespace] = logger
    return logger
  },

  /**
   * @param {Utils.LoggerLevel} level
   * @param {string} [namespace]
   */
  setLevel: function setLevel (level, namespace) {
    if (namespace) {
      if (LoggerMap[namespace]) {
        LoggerMap[namespace].setLevel(level)
      }
    }

    for (var propKey in LoggerMap) {
      LoggerMap[propKey].setLevel(level)
    }
  }
}

// 创建默认Logger
module.exports.get(DEFAULT_NAMESPACE)

