/**
 * @Author sugo.io<asd>
 * @Date 17-10-30
 */

var _ = require('./utils')._
var Regulation = require('./regulation-parser')
var Selector = require('./css-path')
var Logger = require('./logger').get('Sugoio.Debugger')

/**
 * @typedef {Object} SDKBuffer
 * @property {Array<PageConfDesc>} PageConfigs        - 页面配置列表
 * @property {Array<EventDesc>}  PageEvents           - 页面事件列表
 * @property {Array<PageCateGoryDesc>} PageCategories - 页面分类列表
 */

/** @type {SDKBuffer} */
var Buffer = {
  PageConfigs: [],
  PageEvents: [],
  PageCategories: []
}

var Debugger = {
  /**
   * css path apis
   */
  Selector: Selector,

  /**
   * 'PageConfigs'|'PageEvents'|'PageCategories'
   * @param {string} key
   * @param {*} value
   * @return {exports}
   */
  addBuffer: function (key, value) {
    if (!Buffer.hasOwnProperty(key)) {
      Logger.warn('Not allow key: [%s]', key)
      return this
    }
    Buffer[key] = value
    return this
  },

  /**
   * @param {function} filter
   * @return {EventDesc|null}
   */
  findEvent: function (filter) {
    return Buffer.PageEvents.find(filter) || null
  },

  /**
   * @param {function} filter
   * @return {PageConfigs|null}
   */
  findPageConfig: function (filter) {
    return Buffer.PageConfigs.find(filter) || null
  },

  /**
   * @param {function} filter
   * @return {PageCategories|null}
   */
  findCategories: function (filter) {
    return Buffer.PageCategories.find(filter) || null
  },

  // Regulation
  Regulation: Regulation,
  // utils
  _: _
}

module.exports = Debugger
