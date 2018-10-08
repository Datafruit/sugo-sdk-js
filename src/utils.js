/**
 * @Author sugo.io<asd>
 * @Date 17-11-14
 */
const utils = require('sugo-sdk-js-utils')

/**
 * 获取当前页面路径
 * @param {*} enable_hash
 */
const getCurrentUrl = (enable_hash) => {
  const hash = enable_hash === true ? location.hash : ''
  return (location.origin || (location.protocol + '//' + location.host)) + location.pathname + hash
}

module.exports = {
  _: utils['default'],
  getCurrentUrl,
  userAgent: window.navigator.userAgent
}
