/**
 * @Author sugo.io<asd>
 * @Date 17-11-11
 * @description 获取服务器配置
 */

var CONSTANTS = require('../constants')
var PRIMARY_INSTANCE_NAME = CONSTANTS.PRIMARY_INSTANCE_NAME
var INJECT_CONFIG_PROP_KEY = CONSTANTS.INJECT_CONFIG_PROP_KEY
var SugoIO = window[PRIMARY_INSTANCE_NAME] || (window[PRIMARY_INSTANCE_NAME] = {})

/** @type {SugoIOSDKJSConfig} */
module.exports = SugoIO[INJECT_CONFIG_PROP_KEY] || (SugoIO[INJECT_CONFIG_PROP_KEY] = {})
