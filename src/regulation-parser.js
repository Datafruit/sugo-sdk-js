/**
 * @Author sugo.io<asd>
 * @Date 17-8-17
 * @description 通配符正则匹配
 */

var Regulation = require('css-selector-parser').Regulation

/**
 * @typedef {object} Regulations
 * @property {function} test
 * @property {function} creator
 * @property {function} exec
 * @property {function} match
 */

module.exports = {
  test: Regulation.test,
  creator: Regulation.creator,
  exec: Regulation.exec,
  match: Regulation.match
}
