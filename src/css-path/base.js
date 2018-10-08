/**
 * @Author sugo.io<asd>
 * @Date 17-9-13
 */

var _ = require('sugo-sdk-js-utils')['default']

/**
 * @param {string} value
 * @param {boolean} optimized
 * @constructor
 */
function DOMNodePathStep (value, optimized) {
  this.value = value
  this.optimized = optimized || false
}

DOMNodePathStep.prototype.toString = function () {
  return this.value
}

/**
 * 将string转为16进制计数
 * @param {string} c
 * @return {string}
 */
function toHexByte (c) {
  var hexByte = c.charCodeAt(0).toString(16)
  if (hexByte.length === 1) {
    hexByte = '0' + hexByte
  }
  return hexByte
}

/**
 * 验证是否为合法的css标识字符
 * 有效字符为[a-zA-Z0-9-]
 * @param {string} c
 * @return {boolean}
 */
function isCSSIdentChar (c) {
  if (/[a-zA-Z0-9_-]/.test(c)) return true
  return c.charCodeAt(0) >= 0xA0
}

/**
 * css标识是否合法
 * 以-或[a-zA-Z-]开头，后接[z-zA-Z0-9-]
 * @param {string} value
 * @return {boolean}
 */
function isCSSIdentifier (value) {
  return /^-?[a-zA-Z_][a-zA-Z0-9_-]*$/.test(value)
}

/**
 * 转义单个css标识字符
 * @param {string} c
 * @param {boolean} isLast
 * @return {string}
 */
function escapeAsciiChar (c, isLast) {
  return '\\' + toHexByte(c) + (isLast ? '' : ' ')
}

/**
 * 转义css标识
 * @param {string} ident
 * @return {string}
 */
function escapeIdentifierIfNeeded (ident) {
  if (isCSSIdentifier(ident)) return ident
  var shouldEscapeFirst = /^(?:[0-9]|-[0-9-]?)/.test(ident)
  var lastIndex = ident.length - 1
  return ident.replace(/./g, function (c, i) {
    return ((shouldEscapeFirst && i === 0) || !isCSSIdentChar(c))
      ? escapeAsciiChar(c, i === lastIndex)
      : c
  })
}

/**
 * 生成id标识符
 * @param {string} id
 * @return {string}
 */
function idSelector (id) {
  return '#' + escapeIdentifierIfNeeded(id)
}

/**
 * 获取节点class属性并转成数组，并加上$前缀
 * @param {Element} node
 * @return {Array}
 */
function prefixedElementClassNames (node) {
  var classAttribute = node.getAttribute('class')
  if (!classAttribute) return []
  var arr = classAttribute.split(/\s+/g)
  arr = _.filter(arr, Boolean)
  return _.map(arr, function (name) {return '$' + name})
}

module.exports.DOMNodePathStep = DOMNodePathStep
module.exports.toHexByte = toHexByte
module.exports.isCSSIdentChar = isCSSIdentChar
module.exports.isCSSIdentifier = isCSSIdentifier
module.exports.escapeAsciiChar = escapeAsciiChar
module.exports.escapeIdentifierIfNeeded = escapeIdentifierIfNeeded
module.exports.idSelector = idSelector
module.exports.prefixedElementClassNames = prefixedElementClassNames
