/**
 * @Author sugo.io<asd>
 * @Date 17-11-18
 */

var _ = require('sugo-sdk-js-utils')['default']
var CONSTANTS = require('../../constants')
var Sugoio = require('./Sugoio')
var Global = require('../global')
var onDOMContentLoaded = require('./on-dom-content-loaded')
var Logger = require('../logger').get('Sugoio')
var utils = require('../utils')


/** @typedef {object<string, Sugoio>} */
var instances = {}

function override_sugo_init_func () {
  /**
   * @param {string} [token]
   * @param {object} [config]
   * @param {string} [name]
   * @return {Sugoio}
   */
  Global.get().init = function (token, config, name) {
    var master = Global.get()
    if (name) {
      // 如果传入name,则表示初始化一个子实例
      // 并将其挂在主实例上
      if (!master[name]) {
        master[name] = instances[name] = Sugoio.create_sugoio(token, config, name)
      }
      return master[name]
    } else {
      var instance
      // 没有name则初始化主实例
      if (instances[CONSTANTS.PRIMARY_INSTANCE_NAME]) {
        // 已经初始化直接返回
        instance = instances[CONSTANTS.PRIMARY_INSTANCE_NAME]
      } else if (token) {
        // 初始化主实例
        instance = Sugoio.create_sugoio(token, config, CONSTANTS.PRIMARY_INSTANCE_NAME)
        instances[CONSTANTS.PRIMARY_INSTANCE_NAME] = instance
      }
      if (!instance) {
        return
      }
      instance._ = _
      Global.set(instance)
      Logger.info('%s initialized', instance.name, window.location.href)
      const heatmap = instance.get_config('heatmap')
      if (heatmap) { // 切换页面时，通知父窗口改变路径
        utils.sendMessage2Parent({
          type: 'changeWindowLocation',
          payload: {
            location: window.location.href
          }
        })
      }
      return instance
    }
  }
}

function init_from_snippet () {
  var master = Global.get()

  // Initialization
  if (_.isUndefined(master)) {
    // sugoio wasn't initialized properly, report error and quit
    return Logger.error('"sugoio" object not initialized. Ensure you are using the latest version of the Sugoio JS Library along with the snippet we provide.')
  }

  if (master.__loaded || (master.config && master.persistence)) {
    // lib has already been loaded at least once; we don't want to override the global object this time so bomb early
    return Logger.error('Sugoio library has already been downloaded at least once.')
  }

  var snippet_version = master.__SV || 0
  if (snippet_version < 1.1) {
    // sugoio wasn't initialized properly, report error and quit
    return Logger.error('Version mismatch; please ensure you\'re using the latest version of the Sugoio code snippet.')
  }

  // Load instances of the Sugoio Library
  _.each(master._i, function (item) {
    if (item && _.isArray(item)) {
      var name = item[item.length - 1]
      if (instances.hasOwnProperty(name)) {
        return Logger.error('Project '.concat(name).concat(' was initialized!'))
      }
      instances[name] = Sugoio.create_sugoio.apply(this, item)
    }
  })

  override_sugo_init_func()
  master.init()

  // Fire loaded events after updating the window's sugoio object
  // 此时并没有loaded,只有在接口数据完全返回后才是loaded状态
  // 所以需要放在track中调用
  //  _.each(instances, function (instance) {
  //    instance._loaded()
  //  })

  // 在DOMContentLoaded之后触发所有实例的 _dom_loaded 方法
  onDOMContentLoaded(function () {
    _.each(instances, function (ins) {
      ins._dom_loaded()
    })
  })
}

module.exports = {
  init_from_snippet
}
