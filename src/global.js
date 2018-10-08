/**
 * @Author sugo.io<asd>
 * @Date 17-10-28
 * @description sdk全局对像，挂载sdk所有数据
 */

/**
 * 定义SDKGlobal对象上的属性
 * @typedef {Object} SDKGlobal
 * @property {string} version
 * @property {Logger} Logger
 *
 * @property {SDKEditor} Editor  - editor
 *
 * @property {Debugger} Debugger
 * @property {Regulations} Regulation
 */

var CONSTANTS = require('../constants')
var logger = require('./logger')
var Debugger = require('./debugger')
var Regulation = require('./regulation-parser')

var PRIMARY_INSTANCE_NAME = CONSTANTS.PRIMARY_INSTANCE_NAME
var INJECT_CONFIG_PROP_KEY = CONSTANTS.INJECT_CONFIG_PROP_KEY
var Store = {}

/**
 * @return {SugoIORawMaster|Sugoio}
 */
function get () {
  return window[PRIMARY_INSTANCE_NAME] || (window[PRIMARY_INSTANCE_NAME] = [])
}

/**
 * @param ins
 * @return {SugoIORawMaster|Sugoio}
 */
function set (ins) {
  var prev = get()
  ins.Global = Global
  ins[INJECT_CONFIG_PROP_KEY] = prev[INJECT_CONFIG_PROP_KEY]
  window[PRIMARY_INSTANCE_NAME] = ins
  return ins
}

/**
 * 全局内存存储器
 * @param {string} key
 * @param {*} value
 * @return {*}
 */
function store (key, value) {
  Store[key] = value
  return value
}

/**
 * @param {string} key
 * @return {*}
 */
function remove (key) {
  var v
  if (Store.hasOwnProperty(key)) {
    v = Store[key]
    delete Store[key]
  }
  return v
}

/**
 * @param {string} key
 * @return {*}
 */
function take (key) {
  return Store[key]
}

var SDKGlobal = get()
/** @type {SDKGlobal} */
var Global = SDKGlobal.Global || (SDKGlobal.Global = {})

Global.Logger = logger
Global.Debugger = Debugger
Global.version = process.env.SDK_VERSION
Global.Regulation = Regulation

// initialize
set(get())

module.exports = {
  Global: Global,
  get: get,
  set: set,
  store: store,
  remove: remove,
  take: take
}


