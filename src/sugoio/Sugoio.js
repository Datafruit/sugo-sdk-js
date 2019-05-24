/**
 * @Author sugo.io<asd>
 * @Date 17-11-18
 */

var Global = require('../global')
var Config = require('../config')
var _ = require('sugo-sdk-js-utils')['default']
var CONSTANTS = require('../../constants')
var Track = require('./Track')

var DEFAULT_CONFIG = require('./default-config')
var request = require('../request')
var API = require('../sugo-event-api')
var onDOMContentLoaded = require('./on-dom-content-loaded')

/* ## Tracker */
var LinkTracker = require('./LinkTracker')
var FormTracker = require('./FormTracker')
var People = require('./People')
var Persistence = require('./Persistence')
var Logger = require('../logger').get('Sugoio')

var userAgent = navigator.userAgent
// http://hacks.mozilla.org/2009/07/cross-site-xmlhttprequest-with-cors/
// https://developer.mozilla.org/en-US/docs/DOM/XMLHttpRequest#withCredentials
var USE_XHR = (window.XMLHttpRequest && 'withCredentials' in new XMLHttpRequest())

// IE<10 does not support cross-origin XHR's but script tags
// with defer won't block window.onload; ENQUEUE_REQUESTS
// should only be true for Opera<12
var isNotIE = userAgent.indexOf('MSIE') === -1
var ENQUEUE_REQUESTS = !USE_XHR && isNotIE && (userAgent.indexOf('Mozilla') === -1)

var DOM_LOADED = false
onDOMContentLoaded(function () {
  DOM_LOADED = true
})

function Sugoio () {
  this.name = null
  this.people = null
  this.proxy = null
  this.config = null
  this.persistence = null
  this.cookie = null

  this.__autotrack_enabled = null
  this.__loaded = null
  this._jsc = null
  this.__dom_loaded_queue = null
  this.__request_queue = null
  this.__disabled_events = null
  this._flags = null
}

/**
 * create_sugoio(token:string, config:object, name:string)
 *
 * This function is used by the init method of Sugoio objects
 * as well as the main initializer at the end of the JSLib (that
 * initializes document.sugoio as well as any additional instances
 * declared before this file has loaded).
 *
 * @param {string} token
 * @param {object} config
 * @param {string} name
 * @return {Sugoio}
 */
Sugoio.create_sugoio = function (token, config, name) {
  var master = Global.get()
  var instance
  var target = (name === CONSTANTS.PRIMARY_INSTANCE_NAME) ? master : master[name]

  // TODO 以是否为Array来判断太草率了些,改为属性值
  if (target && !_.isArray(target)) {
    Logger.error('You have already initialized ' + name)
    return target
  }

  instance = new Sugoio()
  instance._init(token, config, name)
  instance.people = new People()
  instance.people._init(instance)
  instance.__autotrack_enabled = instance.get_config('autotrack')

  // if any instance on the page has debug = true, we set the
  // global debug to be true
  Config.debug = Config.debug || instance.get_config('debug')

  var dimensions = instance.get_config('dimensions')
  if (dimensions) {
    Config.dimensions = dimensions
  }

  if (instance.get_config('autotrack')) {
    var num_buckets = 100
    var num_enabled_buckets = 100
    if (!Track.track.enabledForProject(instance.get_config('token'), num_buckets, num_enabled_buckets)) {
      instance.__autotrack_enabled = false
      Logger.error('Not in active bucket: disabling Automatic Event Collection.')
    } else if (!Track.track.isBrowserSupported()) {
      instance.__autotrack_enabled = false
      Logger.error('Disabling Automatic Event Collection because this browser is not supported')
    } else {
      Track.track.init(instance)
    }
  }

  // if target is not defined, we called init after the lib already
  // loaded, so there won't be an array of things to execute
  if (!_.isUndefined(target) && _.isArray(target)) {
    // Crunch through the people queue first - we queue this data up &
    // flush on identify, so it's better to do all these operations first
    instance._execute_array.call(instance.people, target.people)
    instance._execute_array(target)
  }

  instance.proxy = target.proxy

  return instance
}

Sugoio.prototype.version = process.env.SDK_VERSION

/**
 * 该方法在entry中会被覆写
 * @param {string} token
 * @param {object} config
 * @param {string} name
 * @return {Sugoio}
 */
Sugoio.prototype.init = function (token, config, name) {
  var master = Global.get()
  if (_.isUndefined(name)) {
    Logger.error('You must name your new library: init(token, config, name)')
    return null
  }

  if (name === CONSTANTS.PRIMARY_INSTANCE_NAME) {
    Logger.error('You must initialize the main sugoio object right after you include the Sugoio js snippet')
    return null
  }

  var instance = Sugoio.create_sugoio(token, config, name)
  master[name] = instance
  instance._loaded()

  return instance
}

/* ## Initialization methods */

/**
 * This function initializes a new instance of the Sugoio tracking object.
 * All new instances are added to the main sugoio object as sub properties (such as
 * sugoio.library_name) and also returned by this function. To define a
 * second instance on the page, you would call:
 *
 *     sugoio.init('new token', { your: 'config' }, 'library_name');
 *
 * and use it like so:
 *
 *     sugoio.library_name.track(...);
 *
 * @param {String} token   Your Sugoio API token
 * @param {Object} [config]  A dictionary of config options to override
 * @param {String} [name]    The name for the new sugoio instance that you want created
 */

// sugoio._init(token:string, config:object, name:string)
//
// This function sets up the current instance of the sugoio
// library.  The difference between this method and the init(...)
// method is this one initializes the actual instance, whereas the
// init(...) method sets up a new library and calls _init on it.
//
Sugoio.prototype._init = function (token, config, name) {
  const instance = Global.get()
  this.__loaded = true
  this.name = name
  this.config = {}
  this.set_config(_.extend(
    {},
    DEFAULT_CONFIG,
    // 前端的注入全局配置: websdk_['api_host', 'app_host', 'decide_host', 'enable_geo_track', 'enable_hash', 'js_cdn']
    (instance[CONSTANTS.INJECT_CONFIG_PROP_KEY] || {}),
    // 放在注入配置(INJECT_CONFIG_PROP_KEY)之后，因为处理过app_host等http协议
    _.pick(DEFAULT_CONFIG, ['api_host', 'app_host', 'decide_host', 'cdn']),
    config,
    {
      name,
      token,
      projectId: config.project_id,
      'callback_fn': ((name === CONSTANTS.PRIMARY_INSTANCE_NAME) ? name : CONSTANTS.PRIMARY_INSTANCE_NAME + '.' + name) + '._jsc'
    }))

  this._jsc = function () {}

  this.__dom_loaded_queue = []
  this.__request_queue = []
  this.__disabled_events = []
  this._flags = {
    disable_all_events: false,
    identify_called: false
  }

  this.persistence = this.cookie = new Persistence(this.config)
  this.register_once({ distinct_id: _.UUID() }, '')
}

/** start ## just for yuxin sdk */
Sugoio.prototype.load = function(code, options) {
  // if (!code || !options.title) {
  //   return
  // }
  Logger.debug('load singlePage => ', code, options)
  // 设置全局页面code变量
  window[CONSTANTS.SINGLE_PAGE_CODE] = {
    code: code || '',
    title: options.title || document.title
  }
  // 埋点模式
  if (Global.Global.Editor) {
    setTimeout(() => {
      // 触发editor的'store_single_page_code' watcher 重新加载页面配置
      Global.Global.Editor.run.vm.vm.store_single_page_code = code
    }, 500)
    return
  }
  //***************以下为正常访问页面模式 ******************/
  // 加载页面配置绑定事件
  const instance = Global.get()
  Track.track.loadSdkDecide(instance)
  // 计时停留事件
  instance.time_event('停留')
}

Sugoio.prototype.unload = function(code, options) {
  // if (!code || !options.title) {
  //   return
  // }
  Logger.debug('unload singlePage => ', code, options)
  // 埋点模式
  if (Global.Global.Editor) {
    return
  }
  // 上报停留事件
  const instance = Global.get()
  const enable_hash = instance.get_config('enable_hash') || false
  const path_name = Track.track._getPathname(enable_hash)
  instance.track('停留', {
    event_type: 'duration',
    path_name: path_name,
    page_name: options.title || document.title,
    current_url: (location.origin || (location.protocol + '//' + location.host)) + path_name
  })
}

/* end ## just for yuxin sdk */


/* ## Private methods */

Sugoio.prototype._loaded = function () {
  const instance = this
  // sdk 加载完成，init配置loaded回调
  this.get_config('loaded')(instance)

  // 如果配置自动上报停留事件
  const duration_track = this.get_config('duration_track')
  if (duration_track === true) {
    this.time_event('停留')
    _.register_event(window, 'beforeunload', function() {
      // 上传页面点击事件
      if (0 < Track.track._cachedGridClickEvents.length) {
        instance.batch_track('屏幕点击', Track.track._cachedGridClickEvents)
      }
      instance.track('停留')
      // for ie 会弹出是否离开的框
      // 判断是否 IE，是才抛异常
      if (!isNotIE) {
        throw new Error('beforeunload')
      }
    }, false, true)
  }

  // this happens after so a user can call identify/name_tag in
  // the loaded callback
  if (this.get_config('track_pageview')) {
    this.track_pageview()
  }
}

Sugoio.prototype._dom_loaded = function () {
  _.each(this.__dom_loaded_queue, function (item) {
    this._track_dom.apply(this, item)
  }, this)
  _.each(this.__request_queue, function (item) {
    this._send_request.apply(this, item)
  }, this)
  delete this.__dom_loaded_queue
  delete this.__request_queue
}

/**
 * @param {DomTracker} DomClass
 * @param args
 * @return {*}
 * @private
 */
Sugoio.prototype._track_dom = function (DomClass, args) {
  if (this.get_config('img')) {
    Logger.error('You can\'t use DOM tracking functions with img = true.')
    return false
  }

  if (!DOM_LOADED) {
    this.__dom_loaded_queue.push([DomClass, args])
    return false
  }

  var dt = new DomClass().init(this)
  return dt.track.apply(dt, args)
}

/**
 * _prepare_callback() should be called by callers of _send_request for use
 * as the callback argument.
 *
 * If there is no callback, this returns null.
 * If we are going to make XHR/XDR requests, this returns a function.
 * If we are going to use script tags, this returns a string to use as the
 * callback GET param.
 */
Sugoio.prototype._prepare_callback = function (callback, data) {
  if (_.isUndefined(callback)) {
    return null
  }

  if (USE_XHR) {
    return function (response) {
      callback(response, data)
    }
  } else {
    // if the user gives us a callback, we store as a random
    // property on this instances jsc function and update our
    // callback string to reflect that.
    var jsc = this._jsc
    var randomized_cb = '' + Math.floor(Math.random() * 100000000)
    var callback_string = this.get_config('callback_fn') + '[' + randomized_cb + ']'
    jsc[randomized_cb] = function (response) {
      delete jsc[randomized_cb]
      callback(response, data)
    }
    return callback_string
  }
}

Sugoio.prototype._send_request = function (url, data, callback, encoded_data) {
  if (ENQUEUE_REQUESTS) {
    this.__request_queue.push(arguments)
    return
  }

  // needed to correctly format responses
  var verbose_mode = this.get_config('verbose')
  if (data.verbose) { verbose_mode = true }
  if (this.get_config('test')) { data.test = 1 }
  if (verbose_mode) { data.verbose = 1 }
  if (this.get_config('img')) { data.img = 1 }
  if (!USE_XHR) {
    if (callback) {
      data.callback = callback
    } else if (verbose_mode || this.get_config('test')) {
      // Verbose output (from verbose mode, or an error in test mode) is a json blob,
      // which by itself is not valid javascript. Without a callback, this verbose output will
      // cause an error when returned via jsonp, so we force a no-op callback param.
      // See the ECMA script spec: http://www.ecma-international.org/ecma-262/5.1/#sec-12.4
      data.callback = '(function(){})'
    }
  }

  data.ip = this.get_config('ip') ? 1 : 0
  data._ = new Date().getTime().toString()
  url += '?' + _.HTTPBuildQuery(data)

  if ('img' in data) {
    var img = document.createElement('img')
    img.src = url
    document.body.appendChild(img)
  } else if (USE_XHR && !data.data) {
    try {
      var req = new XMLHttpRequest()
      req.open('GET', url, true)
      // send the mp_optout cookie
      // withCredentials cannot be modified until after calling .open on Android and Mobile Safari
      req.withCredentials = false
      req.onreadystatechange = function () {
        if (req.readyState === 4) { // XMLHttpRequest.DONE == 4, except in safari 4
          if (url.indexOf('api.sugoio.com/track') !== -1) {
            Track.track.checkForBackoff(req)
          }
          if (req.status === 200) {
            if (callback) {
              if (verbose_mode) {
                callback(_.JSONDecode(req.responseText))
              } else {
                callback(Number(req.responseText))
              }
            }
          } else {
            var error = 'Bad HTTP status: ' + req.status + ' ' + req.statusText
            Logger.error(error)
            if (callback) {
              if (verbose_mode) {
                callback({ status: 0, error: error })
              } else {
                callback(0)
              }
            }
          }
        }
      }
      req.send(null)
    } catch (e) {
      Logger.error(e)
    }
  } else if (USE_XHR && data.data) { // post上报信息到网关
    try {

      var reqPost = new XMLHttpRequest()
      reqPost.open('POST', url, true)
      // send the mp_optout cookie
      // withCredentials cannot be modified until after calling .open on Android and Mobile Safari
      reqPost.withCredentials = false
      // reqPost.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
      reqPost.onreadystatechange = function () {
        if (reqPost.readyState === 4) { // XMLHttpRequest.DONE == 4, except in safari 4
          if (url.indexOf('api.sugoio.com/track') !== -1) {
            Track.track.checkForBackoff(reqPost)
          }
          if (reqPost.status === 200) {
            if (callback) {
              if (verbose_mode) {
                callback(_.JSONDecode(reqPost.responseText))
              } else {
                callback(Number(reqPost.responseText))
              }
            }
          } else {
            var error = 'Bad HTTP status: ' + reqPost.status + ' ' + reqPost.statusText
            Logger.error(error)
            if (callback) {
              if (verbose_mode) {
                callback({ status: 0, error: error })
              } else {
                callback(0)
              }
            }
          }
        }
      }
      reqPost.send(encoded_data)
    } catch (e) {
      Logger.error(e)
    }
  } else {
    var script = document.createElement('script')
    script.type = 'text/javascript'
    script.async = true
    script.defer = true
    script.src = url
    var s = document.getElementsByTagName('script')[0]
    s.parentNode.insertBefore(script, s)
  }
}

/**
 * _execute_array() deals with processing any sugoio function
 * calls that were called before the Sugoio library were loaded
 * (and are thus stored in an array so they can be called later)
 *
 * Note: we fire off all the sugoio function calls && user defined
 * functions BEFORE we fire off sugoio tracking calls. This is so
 * identify/register/set_config calls can properly modify early
 * tracking calls.
 *
 * @param {Array} array
 */
Sugoio.prototype._execute_array = function (array) {
  var fn_name, alias_calls = [], other_calls = [], tracking_calls = []
  _.each(array, function (item) {
    if (item) {
      fn_name = item[0]
      if (typeof(item) === 'function') {
        item.call(this)
      } else if (_.isArray(item) && fn_name === 'alias') {
        alias_calls.push(item)
      } else if (_.isArray(item) && fn_name.indexOf('track') !== -1 && typeof(this[fn_name]) === 'function') {
        tracking_calls.push(item)
      } else {
        other_calls.push(item)
      }
    }
  }, this)

  var execute = function (calls, context) {
    _.each(calls, function (item) {
      this[item[0]].apply(this, item.slice(1))
    }, context)
  }

  execute(alias_calls, this)
  execute(other_calls, this)
  execute(tracking_calls, this)
}

/**
 * push() keeps the standard async-array-push
 * behavior around after the lib is loaded.
 * This is only useful for external integrations that
 * do not wish to rely on our convenience methods
 * (created in the snippet).
 *
 * ### Usage:
 *     sugoio.push(['register', { a: 'b' }]);
 *
 * @param {Array} item A [function_name, args...] array to be executed
 */
Sugoio.prototype.push = function (item) {
  this._execute_array([item])
}

/**
 * Disable events on the Sugoio object. If passed no arguments,
 * this function disables tracking of any event. If passed an
 * array of event names, those events will be disabled, but other
 * events will continue to be tracked.
 *
 * Note: this function does not stop other sugoio functions from
 * firing, such as register() or people.set().
 *
 * @param {Array} [events] An array of event names to disable
 */
Sugoio.prototype.disable = function (events) {
  if (typeof(events) === 'undefined') {
    this._flags.disable_all_events = true
  } else {
    this.__disabled_events = this.__disabled_events.concat(events)
  }
}

Sugoio.prototype._encode = function (event_name, properties) {
  var master = Global.get()

  // set defaults
  properties = properties || {}
  properties.token = this.get_config('token')

  // set duration if time_event was previously called for this event
  var start_timestamp = this.persistence.remove_event_timer(event_name)
  if (!_.isUndefined(start_timestamp)) {
    var duration_in_ms = new Date().getTime() - start_timestamp
    properties.duration = parseFloat((duration_in_ms / 1000).toFixed(2))
    properties.event_type = 'duration' //增加停留事件类型
    properties.host = location.host
  }

  // update persistence
  this.persistence.update_search_keyword(document.referrer)

  if (this.get_config('store_google')) {
    this.persistence.update_campaign_params()
  }

  if (this.get_config('save_referrer')) {
    this.persistence.update_referrer_info(document.referrer)
  }

  // note: extend writes to the first object, so lets make sure we
  // don't write to the persistence properties object and info
  // properties object by passing in a new object
  // update properties with pageview info and super-properties
  const enable_hash = this.get_config('enable_hash') || false
  properties = _.extend(
    {
      event_type: 'click', // default event_type
      path_name: Track.track._getPathname(enable_hash)
    },
    _.info.properties(),
    // referrer may be in cookie
    _.omit(this.persistence.properties(), ['referrer']),
    { sdk_version: this.version || Global.Global.version },
    properties
  )

  // 上报页面分类
  if (master.page_category) {
    properties.page_category = master.page_category
  }

  var realPeople = this._getRealPeopleJson()
  properties = _.extend({}, properties, realPeople)

  var property_blacklist = this.get_config('property_blacklist')
  if (_.isArray(property_blacklist)) {
    _.each(property_blacklist, function (blacklisted_prop) {
      delete properties[blacklisted_prop]
    })
  } else {
    Logger.error('Invalid value for property_blacklist config: ' + property_blacklist)
  }

  var encode_type = this.get_config('encode_type')
  var isJSON = encode_type && encode_type === 'json'
  var data,
    serverDimensions = Global.take('serverDimensions'),
    dimensions = this.get_config('dimensions')

  var defaultProps = { 'event_name': event_name }
  if (properties.event_id) {
    defaultProps.event_id = properties.event_id
  }
  var singlePage = window[CONSTANTS.SINGLE_PAGE_CODE]
  // 如果代码埋点设置了page_name则不覆盖，以代码埋点优先
  if (!properties.page_name) {
    // 设置自定义页面名称
    // 默认当前页面title
    var pageInfo = Global.take('pageInfo')
    if (pageInfo && pageInfo.page_name) {
      properties.page_name = pageInfo.page_name
    } else {
      properties.page_name = singlePage && singlePage.title ? singlePage.title : document.title
    }
  }

  // 重新赋值current_url
  if (singlePage && singlePage.code) {
    properties.current_url = Track.track._getCurrentUrl()
  }

  var session_id = this.get_property('session_id')
  if (!session_id) {
    session_id = _.shortUUID()
    var expire_days = 1 //session_id expire_days
    this.register_once({ 'session_id': session_id }, '', expire_days)
  }
  properties.session_id = session_id

  if (isJSON) { //json数据包需要数值包裹
    data = [_.extend(defaultProps, properties)]
  } else {
    data = _.extend(defaultProps, properties)
  }
  var truncated_data = _.truncate(data, 255)
  var json_data = isJSON
    ? _.JSONEncode(truncated_data)
    : _.PlainEncode(truncated_data, dimensions, serverDimensions)

  if (!json_data) {
    Logger.error('Empty content. event name is => '.concat(event_name))
    Logger.log('Please check the length of dimensions that from server.')
  }

  return {
    truncated_data: truncated_data,
    json_data: json_data
  }
}

/**
 * Track an event. This is the most important and
 * frequently used Sugoio function.
 *
 * ### Usage:
 *
 *     // track an event named 'Registered'
 *     sugoio.track('Registered', {'Gender': 'Male', 'Age': 21});
 *
 * To track link clicks or form submissions, see track_links() or track_forms().
 *
 * @param {String} event_name The name of the event. This can be anything the user does - 'Button Click', 'Sign Up', 'Item Purchased', etc.
 * @param {Object} [properties] A set of properties to include with the event you're sending. These describe the user who did the event or details about the event itself.
 * @param {Function} [callback] If provided, the callback function will be called after tracking the event.
 */
Sugoio.prototype.track = function (event_name, properties, callback) {
  if (!_.isFunction(callback)) {
    callback = _.noop
  }

  if (_.isUndefined(event_name)) {
    Logger.error('No event name provided to sugoio.track')
    return
  }

  if (this._event_is_disabled(event_name)) {
    callback(0)
    return
  }

  var encoded = this._encode(event_name, properties)
  var json_data = encoded.json_data
  var truncated_data = encoded.truncated_data

  var encoded_data = _.base64Encode([json_data])
  Logger.log('json_data:', json_data)
  Logger.log('SUGOIO REQUEST: %o', truncated_data)

  var uri = this.get_config('api_host')
    + '/post?'
    + 'locate=' + this.get_config('project_id')
    + '&token=' + this.get_config('token')

  var async = isNotIE
  request().send('POST', uri, encoded_data, async).success(function () {
    callback(truncated_data)
  })

  return truncated_data
}


/**
 * Batch version of track()
 *
 * ### Usage:
 *
 *     // track an event named 'Registered'
 *     sugoio.track('Registered', [{'Gender': 'Male', 'Age': 21}]);
 *
 * @param {String} event_name The name of the event. This can be anything the user does - 'Button Click', 'Sign Up', 'Item Purchased', etc.
 * @param {Object[]} [propertiesArr] Array of properties to include with the event you're sending. These describe the user who did the event or details about the event itself.
 * @param {Function} [callback] If provided, the callback function will be called after tracking the event.
 */
Sugoio.prototype.batch_track = function(event_name, propertiesArr, callback) {
  if (!_.isFunction(callback)) {
    callback = _.noop
  }

  if (_.isUndefined(event_name)) {
    Logger.error('No event name provided to sugoio.track')
    return
  }

  if (this._event_is_disabled(event_name)) {
    callback(0)
    return
  }

  var _this = this
  var wrappers = _.map(propertiesArr, function(p) {
    return _this._encode(event_name, p)
  })
  var jsonDataArr = _.map(wrappers, function(w, i) {
    if (!w || !w.json_data) {
      return ''
    }
    var jsonData = w.json_data
    // [header\x02vals, vals, vals...]
    return i === 0 ? jsonData : jsonData.substr(jsonData.indexOf('\x02') + 1)
  })
  var truncatedDataArr = _.map(wrappers, function(w) {
    return w && w.truncated_data
  })

  var jsonData = jsonDataArr.join('\x02')

  var encoded_data = _.base64Encode([jsonData])
  Logger.log('json_data:', jsonData)
  Logger.log('SUGOIO REQUEST: %o', truncatedDataArr)

  var uri = this.get_config('api_host')
    + '/post?'
    + 'locate=' + this.get_config('project_id')
    + '&token=' + this.get_config('token')

  var async = isNotIE
  request().send('POST', uri, encoded_data, async).success(function () {
    callback(truncatedDataArr)
  })

  return truncatedDataArr
}

/**
 * Track a page view event, which is currently ignored by the server.
 * This function is called by default on page load unless the
 * track_pageview configuration variable is false.
 *
 * @param {String} [page] The url of the page to record. If you don't include this, it defaults to the current url.
 * @api private
 */
Sugoio.prototype.track_pageview = function (page) {
  const enable_hash = this.get_config('enable_hash') || false
  if (_.isUndefined(page)) {
    page = Track.track._getPathname(enable_hash)
  }
  this.track('页面加载', _.info.pageviewInfo(page))
}

/**
 * Track clicks on a set of document elements. Selector must be a
 * valid query. Elements must exist on the page at the time track_links is called.
 *
 * ### Usage:
 *
 *     // track click for link id #nav
 *     sugoio.track_links('#nav', 'Clicked Nav Link');
 *
 * ### Notes:
 *
 * This function will wait up to 300 ms for the Sugoio
 * servers to respond. If they have not responded by that time
 * it will head to the link without ensuring that your event
 * has been tracked.  To configure this timeout please see the
 * set_config() documentation below.
 *
 * If you pass a function in as the properties argument, the
 * function will receive the DOMElement that triggered the
 * event as an argument.  You are expected to return an object
 * from the function; any properties defined on this object
 * will be sent to sugoio as event properties.
 *
 * @type {Function}
 * @param {Object|String} query A valid DOM query, element or jQuery-esque list
 * @param {String} event_name The name of the event to track
 * @param {Object|Function} [properties] A properties object or function that returns a dictionary of properties when passed a DOMElement
 */
Sugoio.prototype.track_links = function (query, event_name, properties) {
  return this._track_dom.call(this, LinkTracker, arguments)
}

/**
 * Track form submissions. Selector must be a valid query.
 *
 * ### Usage:
 *
 *     // track submission for form id 'register'
 *     sugoio.track_forms('#register', 'Created Account');
 *
 * ### Notes:
 *
 * This function will wait up to 300 ms for the sugoio
 * servers to respond, if they have not responded by that time
 * it will head to the link without ensuring that your event
 * has been tracked.  To configure this timeout please see the
 * set_config() documentation below.
 *
 * If you pass a function in as the properties argument, the
 * function will receive the DOMElement that triggered the
 * event as an argument.  You are expected to return an object
 * from the function; any properties defined on this object
 * will be sent to sugoio as event properties.
 *
 * @type {Function}
 * @param {Object|String} query A valid DOM query, element or jQuery-esque list
 * @param {String} event_name The name of the event to track
 * @param {Object|Function} [properties] This can be a set of properties, or a function that returns a set of properties after being passed a DOMElement
 */
Sugoio.prototype.track_forms = function (query, event_name, properties) {
  return this._track_dom.call(this, FormTracker, arguments)
}

/**
 * Time an event by including the time between this call and a
 * later 'track' call for the same event in the properties sent
 * with the event.
 *
 * ### Usage:
 *
 *     // time an event named 'Registered'
 *     sugoio.time_event('Registered');
 *     sugoio.track('Registered', {'Gender': 'Male', 'Age': 21});
 *
 * When called for a particular event name, the next track call for that event
 * name will include the elapsed time between the 'time_event' and 'track'
 * calls. This value is stored as seconds in the 'duration' property.
 *
 * @param {String} event_name The name of the event.
 * @return {Sugoio}
 */
Sugoio.prototype.time_event = function (event_name) {
  if (_.isUndefined(event_name)) {
    Logger.error('No event name provided to sugoio.time_event')
    return this
  }

  if (this._event_is_disabled(event_name)) {
    return this
  }

  this.persistence.set_event_timer(event_name, new Date().getTime())
  return this
}

/**
 * Register a set of super properties, which are included with all
 * events. This will overwrite previous super property values.
 *
 * ### Usage:
 *
 *     // register 'Gender' as a super property
 *     sugoio.register({'Gender': 'Female'});
 *
 *     // register several super properties when a user signs up
 *     sugoio.register({
 *         'Email': 'jdoe@example.com',
 *         'Account Type': 'Free'
 *     });
 *
 * @param {Object} props An associative array of properties to store about the user
 * @param {Number} [days] How many days since the user's last visit to store the super properties
 */
Sugoio.prototype.register = function (props, days) {
  this.persistence.register(props, days)
}

/**
 * Register a set of super properties only once. This will not
 * overwrite previous super property values, unlike register().
 *
 * ### Usage:
 *
 *     // register a super property for the first time only
 *     sugoio.register_once({
 *         'First Login Date': new Date().toISOString()
 *     });
 *
 * ### Notes:
 *
 * If default_value is specified, current super properties
 * with that value will be overwritten.
 *
 * @param {Object} props An associative array of properties to store about the user
 * @param {*} [default_value] Value to override if already set in super properties (ex: 'False') Default: 'None'
 * @param {Number} [days] How many days since the users last visit to store the super properties
 */
Sugoio.prototype.register_once = function (props, default_value, days) {
  this.persistence.register_once(props, default_value, days)
}

/**
 * Delete a super property stored with the current user.
 *
 * @param {String} property The name of the super property to remove
 */
Sugoio.prototype.unregister = function (property) {
  this.persistence.unregister(property)
}

Sugoio.prototype._register_single = function (prop, value) {
  var props = {}
  props[prop] = value
  this.register(props)
}

/**
 * Clears super properties and generates a new random client_distinct_id for this instance.
 * Useful for clearing data when a user logs out.
 */
Sugoio.prototype.reset = function () {
  this.persistence.clear()
  this._flags.identify_called = false
  this.register_once({ 'distinct_id': _.UUID() }, '')
}

/**
 * Returns the current distinct id of the user. This is either the id automatically
 * generated by the library or the id that has been passed by a call to identify().
 *
 * ### Notes:
 *
 * get_distinct_id() can only be called after the Sugoio library has finished loading.
 * init() has a loaded function available to handle this automatically. For example:
 *
 *     // set client_distinct_id after the sugoio library has loaded
 *     sugoio.init('YOUR PROJECT TOKEN', {
 *         loaded: function(sugoio) {
 *             client_distinct_id = sugoio.get_distinct_id();
 *         }
 *     });
 */
Sugoio.prototype.get_distinct_id = function () {
  return this.get_property('distinct_id')
}

/**
 * Provide a string to recognize the user by. The string passed to
 * this method will appear in the Sugoio Streams product rather
 * than an automatically generated name. Name tags do not have to
 * be unique.
 *
 * This value will only be included in Streams data.
 *
 * @param {String} name_tag A human readable name for the user
 * @api private
 */
Sugoio.prototype.name_tag = function (name_tag) {
  this._register_single('sg_name_tag', name_tag)
}

/**
 * Update the configuration of a sugoio library instance.
 *
 * The default config is:
 *
 *     {
 *       // super properties cookie expiration (in days)
 *       cookie_expiration:          365
 *
 *       // super properties span subdomains
 *       cross_subdomain_cookie:     true
 *
 *       // if this is true, the sugoio cookie or localStorage entry
 *       // will be deleted, and no user persistence will take place
 *       disable_persistence:        false
 *
 *       // type of persistent store for super properties (cookie/
 *       // localStorage) if set to 'localStorage', any existing
 *       // sugoio cookie value with the same persistence_name
 *       // will be transferred to localStorage and deleted
 *       persistence:                'cookie'
 *
 *       // name for super properties persistent store
 *       persistence_name:           ''
 *
 *       // names of properties/superproperties which should never
 *       // be sent with track() calls
 *       property_blacklist:         []
 *
 *       // if this is true, sugoio cookies will be marked as
 *       // secure, meaning they will only be transmitted over https
 *       secure_cookie:              false
 *
 *       // the amount of time track_links will
 *       // wait for Sugoio's servers to respond
 *       track_links_timeout:        300
 *
 *       // should we track a page view on page load
 *       track_pageview:             true
 *
 *       // if you set upgrade to be true, the library will check for
 *       // a cookie from our old js library and import super
 *       // properties from it, then the old cookie is deleted
 *       // The upgrade config option only works in the initialization,
 *       // so make sure you set it when you create the library.
 *       upgrade:                    false
 *     }
 *
 *
 * @param {Object} config A dictionary of new configuration values to update
 */
Sugoio.prototype.set_config = function (config) {
  if (_.isObject(config)) {
    _.extend(this.config, config)

    if (!this.get_config('persistence_name')) {
      this.config.persistence_name = this.config.cookie_name
    }
    if (!this.get_config('disable_persistence')) {
      this.config.disable_persistence = this.config.disable_cookie
    }

    if (this.persistence) {
      this.persistence.update_config(this.config)
    }
    Config.debug = Config.debug || this.get_config('debug')
  }
}

/**
 * returns the current config object for the library.
 */
Sugoio.prototype.get_config = function (prop_name) {
  return this.config[prop_name]
}

/**
 * Returns the value of the super property named property_name. If no such
 * property is set, get_property() will return the undefined value.
 *
 * ### Notes:
 *
 * get_property() can only be called after the Sugoio library has finished loading.
 * init() has a loaded function available to handle this automatically. For example:
 *
 *     // grab value for 'user_id' after the sugoio library has loaded
 *     sugoio.init('YOUR PROJECT TOKEN', {
 *         loaded: function(sugoio) {
 *             user_id = sugoio.get_property('user_id');
 *         }
 *     });
 *
 * @param {String} property_name The name of the super property you want to retrieve
 */
Sugoio.prototype.get_property = function (property_name) {
  return this.persistence.props[property_name]
}

/**
 * 生成用户真实id维度名
 * @param {string} dimension
 * @return {?string}
 */
Sugoio.createPeopleDimension = function (dimension) {
  if (!_.isString(dimension) || dimension === '') {
    return null
  }

  return CONSTANTS.PEOPLE_REAL_USER_ID_DIMENSION_PREFIX + dimension
}

/**
 * 提取用户真实id维度
 * @param {string} dimension
 * @return {?string}
 */
Sugoio.extractPeopleDimension = function (dimension) {
  if (!_.isString(dimension) || dimension === '') {
    return null
  }

  var i = dimension.indexOf(CONSTANTS.PEOPLE_REAL_USER_ID_DIMENSION_PREFIX)
  if (i === 0) {
    return dimension.replace(CONSTANTS.PEOPLE_REAL_USER_ID_DIMENSION_PREFIX, '')
  }
  return dimension
}

/**
 * @param {string} dimension
 * @return {?string}
 * @private
 */
Sugoio.prototype._getRealPeople = function (dimension) {
  dimension = Sugoio.createPeopleDimension(dimension)
  return dimension ? this.persistence.props[dimension] : null
}

/**
 * 生成用户真实ID维度json
 * @return {{}}
 * @private
 */
Sugoio.prototype._getRealPeopleJson = function () {
  var props = this.persistence.props
  var key = null

  for (var prop in props) {
    if (!props.hasOwnProperty(prop)) continue
    if (prop.indexOf(CONSTANTS.PEOPLE_REAL_USER_ID_DIMENSION_PREFIX) === 0) {
      key = prop
      break
    }
  }

  var result = {}
  if (!key) return result

  var dimension = Sugoio.extractPeopleDimension(key)
  if (!dimension) return result

  result[dimension] = props[key]

  return result
}

/**
 * 录用户Id
 * 函数功能实现如下：
 * 先判断cookie(pc, 移动端存储本地)里是否已存在此登录id的首次登陆时间，
 * 如果不存在则发起请求向服务端获取首次登陆时间，然后上报一条首次访问的时间，
 * 并存储到cookie(pc, 移动端存储本地)
 * 后台接口采用redis存储用户登录ID映射表
 * @param {string} user_id
 * @param {string|function} [user_real_dimension]
 * @param {function(err: Error|null)} [callback]
 * @return {Sugoio}
 */
Sugoio.prototype.track_first_time = function (user_id, user_real_dimension, callback) {
  if (_.isUndefined(user_id) || user_id === '') {
    Logger.error('Track first time param error: user_id required')
    return this
  }

  // track_first_time(user_id, callback)
  if (_.isFunction(user_real_dimension)) {
    callback = user_real_dimension
    user_real_dimension = void 0
  }

  // track_first_time(user_id, user_real_dimension)
  if (_.isString(user_real_dimension) && _.isUndefined(callback)) {
    callback = _.noop
  }

  var user = this._getRealPeople(user_real_dimension)
  var self = this

  if (user === user_id) {
    callback(null)
    return this
  }

  // 向服务端注册，更新cookie存储
  API.getFirstLoginTime(user_id, this.get_config('token'))
    .success(function (res) {
      /** @type {GetFirstLoginTimeResponseStruct} */
      var proxy = res
      if (!proxy.success) {
        return Logger.error('Fetch first login error: %s', proxy.message)
      }
      // 首次登录
      // 将 user_id, first_login_time 写入cookie
      // 并发送首次登录事件

      // 由于用户可能手动清理了cookie,所以每次验证的时候都写一次
      var obj = {}
      obj[CONSTANTS.FIRST_LOGIN_TIME] = proxy.result.firstLoginTime

      var dimension = Sugoio.createPeopleDimension(user_real_dimension)
      if (dimension) {
        obj[dimension] = user_id
      }

      self.register(obj)

      if (proxy.result.isFirstLogin) {
        // 发送首次登录事件
        Logger.info('Store user first login information to cookie: %o', obj)
        self.track(CONSTANTS.FIRST_LOGIN_EVENT_NAME, Track.track._getDefaultProperties('first_login'))
        Logger.info('Track first login event: %s', CONSTANTS.FIRST_LOGIN_EVENT_NAME)
      }

      callback(null)
    })
    .error(function (err) {
      Logger.error('Fetch first login error: %s', err.message)
      callback(err || new Error('查询首次登录时间出错'))
    })

  return this
}

/**
 * 清除真实用户id
 * @param {string} user_id
 * @param {string} user_real_dimension
 * @return {Sugoio}
 */
Sugoio.prototype.clear_first_login = function (user_id, user_real_dimension) {

  if (!_.isString(user_id) || user_id === '') {
    Logger.error('Track clear first login param error: user_id required and must be string')
    return this
  }

  if (!_.isString(user_real_dimension) || user_real_dimension === '') {
    Logger.error('Track clear first login param error: user_real_dimension required and must be string')
    return this
  }

  var dimension = Sugoio.createPeopleDimension(user_real_dimension)
  var user = this._getRealPeople(user_real_dimension)

  if (user !== user_id) return this

  // 清除真实user_id,首次登录时间,维度名
  if (dimension) {
    this.unregister(dimension)
  }

  this.unregister(CONSTANTS.FIRST_LOGIN_TIME)
  return this
}

Sugoio.prototype.toString = function () {
  var name = this.get_config('name')
  if (name !== CONSTANTS.PRIMARY_INSTANCE_NAME) {
    name = CONSTANTS.PRIMARY_INSTANCE_NAME + '.' + name
  }
  return name
}

Sugoio.prototype._event_is_disabled = function (event_name) {
  return _.isBlockedUA(userAgent) || this._flags.disable_all_events || _.include(this.__disabled_events, event_name)
}

Sugoio.prototype.updateSessionId = function(){
  var session_id = _.shortUUID()
  var expire_days = 1 //session_id expire_days
  this.register({ 'session_id': session_id }, expire_days)
}

Sugoio.prototype.getPosition = function (callback) {
  if (!callback) {
    return
  }
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function (position) {
        var coords = position.coords || {}
        callback({ latitude: coords.latitude, longitude: coords.longitude })
      })
  } else {
    console.log('不支持定位功能')
  }
}

module.exports = Sugoio
