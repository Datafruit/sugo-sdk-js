/**
 * @Author sugo.io<asd>
 * @Date 17-11-18
 */

var Config = require('../config')
var _ = require('sugo-sdk-js-utils')['default']
var Events = require('../editor/events')
var match_pathname = require('../match-pathname')
var match_page = require('../match-page')
var Regulation = require('../regulation-parser')
var Selector = require('../css-path')
var API = require('../sugo-event-api')
var SugoIO = require('../global')
var Debugger = require('../debugger')
var request = require('../request')
var CONSTANTS = require('../../constants')
var Logger = require('../logger').get('Track')
var utils = require('../utils')

var DISABLE_COOKIE = '__sgced'
var __HAS_BIND_EVENT_SG = false
var __HAS_BIND_HASHCHANGE_SG = false
var __HAS_BIND_HEATMAP_GRID_SG = false

// specifying these locally here since some websites override the global Node var
// ex: https://www.codingame.com/
var ELEMENT_NODE = 1
var TEXT_NODE = 3

var track = {
  _initializedTokens: [],

  _previousElementSibling: function (el) {
    if (el.previousElementSibling) {
      return el.previousElementSibling
    } else {
      do {
        el = el.previousSibling
      } while (el && el.nodeType !== ELEMENT_NODE)
      return el
    }
  },

  _loadScript: function (scriptUrlToLoad, callback) {
    var scriptTag = document.createElement('script')
    scriptTag.type = 'text/javascript'
    scriptTag.src = scriptUrlToLoad
    scriptTag.onload = callback

    var scripts = document.getElementsByTagName('script')
    if (scripts.length > 0) {
      scripts[0].parentNode.insertBefore(scriptTag, scripts[0])
    } else {
      document.body.appendChild(scriptTag)
    }
  },

  _loadCss: function (url, callback) {
    var stylesheet = document.createElement('link')
    stylesheet.href = url
    stylesheet.rel = 'stylesheet'
    stylesheet.type = 'text/css'
    // temporarily set media to something inapplicable to ensure it'll fetch without blocking render
    stylesheet.media = 'only x'
    // set the media back when the stylesheet loads
    stylesheet.onload = function () {
      stylesheet.media = 'all'
      if (callback) callback()
    }
    document.getElementsByTagName('head')[0].appendChild(stylesheet)
  },

  _getClassName: function (elem) {
    switch (typeof elem.className) {
      case 'string':
        return elem.className
      case 'object': // handle cases where className might be SVGAnimatedString or some other type
        return elem.className.baseVal || elem.getAttribute('class') || ''
      default: // future proof
        return ''
    }
  },

  _getPropertiesFromElement: function (elem) {
    var props = {
      'classes': this._getClassName(elem).split(' '),
      'tag_name': elem.tagName.toLowerCase()
    }

    if (_.include(['input', 'select', 'textarea'], elem.tagName.toLowerCase())) {
      var formFieldValue = this._getFormFieldValue(elem)
      if (this._includeProperty(elem, formFieldValue)) {
        props.value = formFieldValue
      }
    }

    _.each(elem.attributes, function (attr) {
      props['attr__' + attr.name] = attr.value
    })

    var nthChild = 1
    var nthOfType = 1
    var currentElem = elem
    while (currentElem = this._previousElementSibling(currentElem)) { // eslint-disable-line no-cond-assign
      nthChild++
      if (currentElem.tagName === elem.tagName) {
        nthOfType++
      }
    }
    props.nth_child = nthChild
    props.nth_of_type = nthOfType

    return props
  },

  /*
   * Due to potential reference discrepancies (such as the webcomponents.js polyfill)
   * We want to match tagNames instead of specific reference because something like element === document.body
   * won't always work because element might not be a native element.
   */
  _isTag: function (el, tag) {
    return el && el.tagName && el.tagName.toLowerCase() === tag.toLowerCase()
  },

  _shouldTrackDomEvent: function (element, event) {
    if (!element || this._isTag(element, 'html') || element.nodeType !== ELEMENT_NODE) {
      return false
    }
    var tag = element.tagName.toLowerCase()
    switch (tag) {
      case 'html':
        return false
      case 'form':
        return event.type === 'submit'
      case 'input':
        if (_.indexOf(['button', 'submit'], element.getAttribute('type')) === -1) {
          return event.type === 'change' || event.type === 'focus'
        } else {
          return event.type === 'click'
        }
      case 'select':
      case 'textarea':
        return event.type === 'change'
      default:
        return event.type === 'click'
    }
  },

  _getDefaultProperties: function (eventType) {
    const ins = SugoIO.get()
    const enable_hash = ins.get_config('enable_hash') || false
    return _.extend(_.info.properties(), {
      'event_type': eventType,
      'host': window.location.host,
      'path_name': this._getPathname(enable_hash),
      'sdk_version': SugoIO.Global.version
    })
  },

  _getInputValue: function (input) {
    var value = null
    var type = input.type.toLowerCase()
    switch (type) {
      case 'checkbox':
        if (input.checked) {
          value = [input.value]
        }
        break
      case 'radio':
        if (input.checked) {
          value = input.value
        }
        break
      default:
        value = input.value
        break
    }
    return value
  },

  _getSelectValue: function (select) {
    var value
    if (select.multiple) {
      var values = []
      _.each(_.querySelectorAll('[selected]', select), function (option) {
        values.push(option.value)
      })
      value = values
    } else {
      value = select.value
    }
    return value
  },

  _includeProperty: function (input, value) {
    for (var curEl = input; curEl.parentNode && !this._isTag(curEl, 'body'); curEl = curEl.parentNode) {
      var classes = this._getClassName(curEl).split(' ')
      if (_.include(classes, 'sugoio-sensitive') || _.include(classes, 'sugoio-no-track')) {
        return false
      }
    }

    if (_.include(this._getClassName(input).split(' '), 'sugoio-include')) {
      return true
    }

    if (value === null) {
      return false
    }

    // don't include hidden or password fields
    var type = input.type || ''
    switch (type.toLowerCase()) {
      case 'hidden':
        return false
      case 'password':
        return false
    }

    // filter out data from fields that look like sensitive fields
    var name = input.name || input.id || ''
    var sensitiveNameRegex = /^cc|cardnum|ccnum|creditcard|csc|cvc|cvv|exp|pass|seccode|securitycode|securitynum|socialsec|socsec|ssn/i
    if (sensitiveNameRegex.test(name.replace(/[^a-zA-Z0-9]/g, ''))) {
      return false
    }

    if (typeof value === 'string') {
      // check to see if input value looks like a credit card number
      // see: https://www.safaribooksonline.com/library/view/regular-expressions-cookbook/9781449327453/ch04s20.html
      var ccRegex = /^(?:(4[0-9]{12}(?:[0-9]{3})?)|(5[1-5][0-9]{14})|(6(?:011|5[0-9]{2})[0-9]{12})|(3[47][0-9]{13})|(3(?:0[0-5]|[68][0-9])[0-9]{11})|((?:2131|1800|35[0-9]{3})[0-9]{11}))$/
      if (ccRegex.test((value || '').replace(/[\- ]/g, ''))) {
        return false
      }

      // check to see if input value looks like a social security number
      var ssnRegex = /(^\d{3}-?\d{2}-?\d{4}$)/
      if (ssnRegex.test(value)) {
        return false
      }
    }

    return true
  },

  _getFormFieldValue: function (field) {
    var val
    switch (field.tagName.toLowerCase()) {
      case 'input':
        val = this._getInputValue(field)
        break
      case 'select':
        val = this._getSelectValue(field)
        break
      default:
        val = field.value || field.textContent
        break
    }
    return this._includeProperty(field, val) ? val : null
  },

  _getFormFieldProperties: function (form) {
    var formFieldProps = {}
    _.each(form.elements, function (field) {
      var name = field.getAttribute('name') || field.getAttribute('id')
      if (name !== null) {
        name = 'form_field__' + name
        var val = this._getFormFieldValue(field)
        if (this._includeProperty(field, val)) {
          var prevFieldVal = formFieldProps[name]
          if (prevFieldVal !== undefined) { // combine values for inputs of same name
            formFieldProps[name] = [].concat(prevFieldVal, val)
          } else {
            formFieldProps[name] = val
          }
        }
      }
    }, this)
    return formFieldProps
  },

  _extractCustomPropertyValue: function (customProperty) {
    return this._extractElementsValue(customProperty.css_selector).join(',')
  },

  /**
   * @param {String} selector
   * @return {Array<String>}
   * @private
   */
  _extractElementsValue: function (selector) {
    var values = []

    if (!_.isString(selector)) {
      return values
    }

    _.each(_.querySelectorAll(selector), function (elem) {
      if (_.indexOf(['input', 'select'], elem.tagName.toLowerCase()) > -1) {
        values.push(elem.value)
      } else if (elem.textContent) {
        values.push(elem.textContent)
      }
    })

    return values
  },

  /**
   * 获取关联元素内容
   * @param {Array<AssociateDesc>} binds
   * @param  {string} parentSimilarPath
   * @return {Object}
   * @private
   */
  _getAssociatesElementsProps: function (binds, parentSimilarPath) {

    // 上报相关的维度开启同类
    const getChildSimilarPath = (p_path, c_path) => {
      // 获取完整层级path进行比较
      c_path = Selector.entire(document.querySelector(c_path))
      let sameIdx = 0
      // 对比找出控件 和上报维度相同内容
      let pathLength = p_path.length
      for (let i = 0; i < pathLength; i++) {
        if (p_path.charAt(i) !== c_path.charAt(i)) {
          sameIdx = i
          break
        }
      }
      // 生成新的path 获上报控件
      var similarIdex = p_path.substr(sameIdx).substring(0, p_path.substr(sameIdx).indexOf(')'))
      var similarEndPath =  c_path.substr(sameIdx).substring(c_path.substr(sameIdx).indexOf(')'))
      return c_path.substring(0, sameIdx) + similarIdex + similarEndPath
    }

    return (_.isArray(binds) ? binds : []).reduce(function (p, c) {
      let path = c.path
      // 上报相关的维度开启同类
      if (c.similar) { // 根据父同类元素path获取关联元素对应同类path
        path = getChildSimilarPath(parentSimilarPath, path)
      }
      p[c.dimension] = this._extractElementsValue(path).join(',')
      return p
    }.bind(this), {})
  },

  _getCustomProperties: function (targetElementList) {
    var props = {}
    _.each(this._customProperties.events, function (customProperty) {
      // _.each(customProperty.event_selectors, function(eventSelector) {
      var selectors = customProperty.event_path
      if (!_.isArray(selectors)) {
        selectors = [selectors]
      }
      _.each(selectors, function (eventSelector) {
        var eventElements = _.querySelectorAll(eventSelector)
        _.each(eventElements, function (eventElement) {
          if (_.include(targetElementList, eventElement)) {
            props[customProperty.event_name] = this._extractCustomPropertyValue(customProperty)
          }
        }, this)
      }, this)
    }, this)
    return props
  },

  checkForBackoff: function (resp) {
    // temporarily stop CE for X seconds if the 'X-MP-CE-Backoff' header says to
    var secondsToDisable = parseInt(resp.getResponseHeader('X-MP-CE-Backoff'))
    if (!isNaN(secondsToDisable) && secondsToDisable > 0) {
      var disableUntil = _.timestamp() + (secondsToDisable * 1000)
      Logger.log('disabling CE for ' + secondsToDisable + ' seconds (from ' + _.timestamp() + ' until ' + disableUntil + ')')
      _.cookie.set_seconds(DISABLE_COOKIE, true, secondsToDisable, true)
    }
  },

  _getEventTarget: function (e) {
    // https://developer.mozilla.org/en-US/docs/Web/API/Event/target#Compatibility_notes
    if (typeof e.target === 'undefined') {
      return e.srcElement
    } else {
      return e.target
    }
  },

  _cachedGridClickEvents: [],

  /** 网格热图点击格子埋点上报事件 */
  // 满一定次数再上报
  _trackClickPointEvent: function (e, instance, throttleBatchSize = 50) {
    var eventType = e.type
    /*** Don't mess with this code without running IE8 tests on it ***/
    var target = this._getEventTarget(e)
    if (target.nodeType === TEXT_NODE) { // defeat Safari bug (see: http://www.quirksmode.org/js/events_properties.html)
      target = target.parentNode
    }
    Logger.debug('_trackClickPointEvent =>', e.clientX, e.clientY, e)
    var props = _.extend(
      this._getDefaultProperties(eventType),
      {
        event_type: 'onclick_point',
        onclick_point: utils.getEventPointNumber(e.clientX, e.clientY)
      }
    )
    const event_name = '屏幕点击'
    this._cachedGridClickEvents.push(props)
    if (this._cachedGridClickEvents.length < throttleBatchSize) {
      return true
    }
    instance.batch_track(event_name, this._cachedGridClickEvents)
    this._cachedGridClickEvents = []
    return true
  },

  _trackEvent: function (e, instance, events, pageInfo) {
    var eventType = e.type
    /*** Don't mess with this code without running IE8 tests on it ***/
    var target = this._getEventTarget(e)
    if (target.nodeType === TEXT_NODE) { // defeat Safari bug (see: http://www.quirksmode.org/js/events_properties.html)
      target = target.parentNode
    }

    if (this._shouldTrackDomEvent(target, e)) {
      var targetElementList = [target]
      var curEl = target
      while (curEl.parentNode && !this._isTag(curEl, 'body')) {
        targetElementList.push(curEl.parentNode)
        curEl = curEl.parentNode
      }

      // var elementsJson = []
      var href, elementText = '', form, explicitNoTrack = false
      _.each(targetElementList, function (el, idx) {
        // if the element or a parent element is an anchor tag
        // include the href as a property
        if (el.tagName.toLowerCase() === 'a') {
          href = el.getAttribute('href')
        } else if (el.tagName.toLowerCase() === 'form') {
          form = el
        }
        // crawl up to max of 5 nodes to populate text content
        if (!elementText && idx < 5 && el.textContent) {
          var textContent = _.trim(el.textContent)
          if (textContent) {
            elementText = textContent.replace(/[\r\n]/g, ' ').replace(/[ ]+/g, ' ').substring(0, 255)
          }
        }

        // allow users to programatically prevent tracking of elements by adding class 'sugoio-no-track'
        var classes = this._getClassName(el).split(' ')
        if (_.include(classes, 'sugoio-no-track')) {
          explicitNoTrack = true
        }

        // elementsJson.push(this._getPropertiesFromElement(el))
      }, this)

      if (explicitNoTrack) {
        return false
      }
      var props = _.extend(
        this._getDefaultProperties(eventType), {
          'event_label': elementText
        })
      if (form && (eventType === 'submit' || eventType === 'click')) {
        _.extend(props, this._getFormFieldProperties(form))
      }

      _.each(events, _.bind(function (obj) {
        // 过滤事件类型
        if (obj.event_type !== eventType) return

        // 关联维度
        var binds = obj.binds || {}
        var bindsArray = _.map(_.keys(binds), function (dimension) {
          var record = binds[dimension]
          return {
            dimension: dimension,
            path: record.path,
            similar: record.similar
          }
        })

        // 如果是同类元素，也上报数据
        // TODO 性能优化 使用similar_path匹配同类元素

        var path = obj.similar === true ? (obj.similar_path || _.similar(obj.event_path)) : obj.event_path
        var elems = _.querySelectorAll(path)

        _.each(elems, function (elem) {

          if (Events.contains(elem, target)) {
            var event_name = obj.event_name || 'web_event'
            var code = _.trim(obj.code || '')
            var parentSimilarPath = Selector.entire(elem)

            // 确认有效关联元素
            _.extend(props, this._getAssociatesElementsProps(bindsArray, parentSimilarPath))

            if (code) {
              try {
                // web注入代码埋点
                // 代码注入失败不影响整个上报记录
                var sugo_props = new Function('e', 'element', 'conf', 'instance', code)
                var custom_props = sugo_props(e, elem, obj, instance) || {}
                custom_props.from_binding = true

                if (_.isObject(custom_props)) {
                  _.extend(props, custom_props)
                }
              } catch (e) {
                Logger.log('sugoio track code err => ' + e.message)
              }
            }

            props.event_id = obj.event_id
            instance.track(event_name, props)
          }
        }, this)

      }, this))

      return true
    }
  },

  // only reason is to stub for unit tests
  // since you can't override window.location props
  _navigate: function (href) {
    window.location.href = href
  },

  _addDomEventHandlers: function (instance) {
    Logger.log('_addDomEventHandlers', instance)
    //根据可视化配置绑定上报事件
    if (this._customProperties && this._customProperties.events.length > 0) {
      // 改为代理事件以保证动态渲染的dom事件绑定有效
      var handler = _.bind(function (e) {
        if (_.cookie.parse(DISABLE_COOKIE) !== true) {
          e = e || window.event
          this._trackEvent(e, instance, this._customProperties.events, this._customProperties.pageInfo)
        }
      }, this)
      if (!__HAS_BIND_EVENT_SG) { // 事件代理document上（只注册一次）
        _.register_event(document, 'focus', handler, false, true)
        // _.register_event(document, 'submit', handler, false, true)
        _.register_event(document, 'change', handler, false, true)
        _.register_event(document, 'click', handler, false, true)
        __HAS_BIND_EVENT_SG = true
      }
    }

    // 是否启用了网格热图上报功能
    const heatmap_grid_track = instance.get_config('heatmap_grid_track') || false
    if (heatmap_grid_track) {
      const heatmap_grid_track_throttle_batch_size = instance.get_config('heatmap_grid_track_throttle_batch_size') || 50
      const handler = e => {
        if (_.cookie.parse(DISABLE_COOKIE) !== true) {
          e = e || window.event
          this._trackClickPointEvent(e, instance, heatmap_grid_track_throttle_batch_size)
        }
      }
      if (!__HAS_BIND_HEATMAP_GRID_SG) { // 事件代理document上（只注册一次）
        _.register_event(document, 'click', handler, false, true)
        __HAS_BIND_HEATMAP_GRID_SG = true
      }
    }
  },
  _customProperties: {},
  init: function (instance) {
    if (!(document && document.body)) {
      Logger.log('document not ready yet, trying again in 500 milliseconds...')
      setTimeout(() => {
        this.init(instance)
      }, 500)
      return
    }

    var token = instance.get_config('token')
    if (_.indexOf(this._initializedTokens, token) > -1) {
      return Logger.log('autotrack already initialized for token "' + token + '"')
    }
    this._initializedTokens.push(token)
    if (!this._maybeLoadEditor(instance)) {
      const enable_hash = instance.get_config('enable_hash') || false
      // vue单页应用hash变化即页面切换，重新加载配置
      if (enable_hash && !__HAS_BIND_HASHCHANGE_SG) {
        __HAS_BIND_HASHCHANGE_SG = true
        // 首次载入是加载配置
        this.loadSdkDecide(instance)
        window.addEventListener('hashchange', () => {
          setTimeout(() => {
            // load server events config
            this.loadSdkDecide(instance)
          }, 200)
        }, false)
      } else {
        // load server events config
        this.loadSdkDecide(instance)
      }
    }
  },
  /** load page dicede */
  loadSdkDecide: function(instance) {
    const enable_hash = instance.get_config('enable_hash') || false
    const token = instance.get_config('token')
    let url = this._getCurrentUrl(enable_hash)
    let that = this
    let path = location.pathname + (enable_hash ? location.hash : '')
    API.set_host(instance.get_config('app_host'))
    // 获取页面分类
    API.getDeployedPageCategories(token, '0').success((res) => {
      var categories = res.success ? res.result : []
      Logger.debug('Page categories: %s', categories)
      Debugger.addBuffer('PageCategories', categories)
      var regulations = _.map(categories, function (r) {
        return r.regulation
      })
      var matched = Regulation.exec(url, regulations)
      instance.page_category = null // 每次清空页面分类设置
      if (matched) {
        var record = _.find(categories, function (r) {return r.regulation === matched}) || {}
        instance.page_category = record.name
      }

      // 加载获取pathname
      var separator = '____'
      match_pathname(instance.get_config('decide_host'), token, url, path, true, function (err, pathname) {
        // 加载事件
        if (err) {
          return Logger.error(err)
        }
        var uri = instance.get_config('decide_host') + '/api/sdk/desktop/decide?'
          + 'verbose=true'
          + '&version=0'
          + '&lib=web'
          + '&projectId=' + instance.get_config('project_id')
          + '&path_name=' + encodeURIComponent(pathname.join(separator))
          + '&token=' + token
          + '&separator=' + separator

        request().send('GET', uri).success(that._parseDecideResponse)
      })
    })
  },

  /** decide callbak */
  _parseDecideResponse: function (response) {
    const instance = SugoIO.get()
    const enable_hash = instance.get_config('enable_hash') || false
    if (!response.success) {
      return Logger.error(response.message)
    }
    var res = null
    // 捕获服务端返回异常空数据引发的bug
    try {
      res = _.JSONDecode(_.decompressUrlQuery(response.result))
    } catch (e) {
      Logger.error(e.message)
      Logger.error(e.stack)
    }

    if (!res) return

    Logger.debug('Page decide: %o', res)

    if (res.config.enable_collect_everything === true) {
      let url = this._getCurrentUrl(enable_hash)
      var pageInfo = match_page(url, res.page_info) || {}
      var serverDimensions = res.dimensions
      if (!serverDimensions || serverDimensions.length < 1) {
        return Logger.error('获取服务端预设维度错误')
      }

      // instance.serverDimensions = serverDimensions
      SugoIO.store('serverDimensions', serverDimensions)
      SugoIO.store('positionConfig', res.position_config || 0)

      this._customProperties.events = res.web_event_bindings || {}
      this._customProperties.pageInfo = pageInfo

      // Write in Debugger
      Debugger.addBuffer('PageEvents', res.web_event_bindings)
      Debugger.addBuffer('PageConfigs', res.page_info)

      var props = this._getDefaultProperties('view')
      if (pageInfo.code) {
        // 浏览参数设置代码注入
        try {
          // 代码注入失败不影响整个上报记录
          var sugo_props = new Function('conf', 'instance', pageInfo.code)
          var custom_props = sugo_props(pageInfo, instance) || {}
          if (_.isObject(custom_props)) {
            _.extend(props, custom_props)
          }
        } catch (e) {
          Logger.error('sugoio track code err => %s', e.message)
        }
      }
      if (pageInfo.page_name) {
        // 写入全局 storage
        SugoIO.store('pageInfo', pageInfo)
      }
      var singlePage = window[CONSTANTS.SINGLE_PAGE_CODE]
      var page_name = (pageInfo.page_name || (singlePage && singlePage.title ?singlePage.title : document.title))
      var properties = _.extend({ page_name: page_name }, props)

      // 次访问时间记录
      if (!instance.persistence.props.hasOwnProperty(CONSTANTS.FIRST_VISIT_TIME)) {
        var timestamp = _.timestamp()
        var tmp = {}

        tmp[CONSTANTS.FIRST_VISIT_TIME] = timestamp
        properties = _.extend({}, properties, tmp)
        instance.register_once(tmp)

        Logger.info('Track first visit event: %s', timestamp)

        // 上报首次访问之后再上报浏览事件
        var p = _.extend({}, properties, { event_type: 'first_visit' })
        instance.track(CONSTANTS.FIRST_VISIT_EVENT_NAME, p, function () {
          instance._loaded()
          instance.track('浏览', properties)
        })
      } else {
        instance._loaded()
        instance.track('浏览', properties)
      }

      this._addDomEventHandlers(instance)

      //上报地理位置信息
      var lastReportTime = instance.get_property('last_report_time')
      var now = Date.now()
      var timesConfig = SugoIO.take('positionConfig')
      // var enableGeoTrack = instance.get_config('enable_geo_track')
      // 只要服务端配置了上报地理位置的间隔时间，就开启上报位置信息功能
      if (timesConfig && (!lastReportTime || now - lastReportTime >= (timesConfig * 1000 * 60))) {
        try {
          instance.getPosition(p => {
            if (typeof (p.latitude) === 'undefined' || typeof (p.longitude) === 'undefined') {
              return
            }
            instance.track('位置信息收集', {
              sugo_latitude: p.latitude,
              sugo_longitude: p.longitude,
              event_type: '位置'
            })
          })
        } catch (error) {
          console.log('上报位置信息报错', error.message)
        }
        instance.register({ last_report_time: now })
      }
    } else {
      instance.__autotrack_enabled = false
    }
  },
  _getCurrentUrl: function(enable_hash) {
    const hash = enable_hash === true ? location.hash : ''
    // 宇信专有判断
    const singlePage = window[CONSTANTS.SINGLE_PAGE_CODE]
    const single_page_code = singlePage && singlePage.code ? ('#' + singlePage.code) : ''
    return (location.origin || (location.protocol + '//' + location.host)) + location.pathname + single_page_code + hash
  },

  _getPathname: function(enable_hash) {
    const hash = enable_hash === true ? location.hash : ''
    // 宇信专有判断
    const singlePage = window[CONSTANTS.SINGLE_PAGE_CODE]
    const single_page_code = singlePage && singlePage.code ? ('#' + singlePage.code) : ''
    return window.location.pathname + single_page_code + hash
  },

  _editorParamsFromHash: function (instance, state) {
    var editorParams
    try {
      if (_.isString(state)) {
        state = _.JSONDecode(state)
      }
      var expiresInSeconds = state.expires_in
      editorParams = {
        'accessToken': state.access_token,
        'accessTokenExpiresAt': (new Date()).getTime() + (Number(expiresInSeconds) * 1000),
        'projectToken': state.token,
        'projectId': state.project_id,
        'userId': state.user_id,
        'choosePage': state.choose_page
      }
      window.sessionStorage.setItem('editorParams', _.JSONEncode(editorParams))

      if (state.desiredHash) {
        window.location.hash = state.desiredHash
      } else if (window.history) {
        history.replaceState('', document.title, window.location.pathname + window.location.search) // completely remove hash
      } else {
        window.location.hash = '' // clear hash (but leaves # unfortunately)
      }
    } catch (e) {
      Logger.error('Unable to parse data from hash', e)
    }
    return editorParams
  },

  /**
   * To load the visual editor, we need an access token and other state. That state comes from one of three places:
   * 1. In the URL hash params if the customer is using an old snippet
   * 2. From session storage under the key `_sugocehash` if the snippet already parsed the hash
   * 3. From session storage under the key `editorParams` if the editor was initialized on a previous page
   */
  _maybeLoadEditor: function (instance) {
    var win = window
    var storage = win.sessionStorage
    var hash = ''
    var fromHash = false
    var fromStorage = storage.getItem('_sugocehash')
    var params
    try {
      hash = window.atob(win.location.hash.replace('#', ''))
      if (hash && _.includes(hash, 'state')) {
        fromHash = _.JSONDecode(hash).state
      }
    } catch (e) {
      // console.log(e)
    }
    
    if (fromHash) {
      // happens if they are initializing the editor using an old snippet
      params = this._editorParamsFromHash(instance, fromHash)
    } else if (fromStorage) {
      // happens if they are initialized the editor and using the new snippet
      params = this._editorParamsFromHash(instance, fromStorage)
      storage.removeItem('_sugocehash')
    } else {
      // get credentials from sessionStorage from a previous initialzation
      params = _.JSONDecode(storage.getItem('editorParams') || '{}')
    }

    if (!params.app_host) {
      params.app_host = instance.get_config('app_host')
    }

    // 可视化埋点模式
    if (params.projectToken && instance.get_config('token') === params.projectToken) {
      this._loadEditor(instance, params)
      return true
    }

    // 热图模式
    const heatmap = instance.get_config('heatmap')
    if (heatmap && params.heatmapType && instance.get_config('project_id') === params.projectId) {
      this._loadEditor(instance, params)
      return true
    }
    // 项目ID不对应
    if (heatmap && params.heatmapType && instance.get_config('project_id') !== params.projectId) {
      utils.sendMessage2Parent({
        type: 'projectError',
        payload: {
          currentProjectId: params.projectId,
          configProjectId: instance.get_config('project_id')
        }
      })
      return false
    }
    return false
  },

  // only load the codeless event editor once, even if there are multiple instances of SugoioLib
  _editorLoaded: false,
  _loadEditor: function (instance, editorParams) {
    var that = this
    // TODO css与js一起打包，避免其中某一个加载失败造成的造成的异常
    if (!this._editorLoaded) {
      this._editorLoaded = true
      var editorUrl
      var cacheBuster = '?_ts=' + (new Date()).getTime()
      var siteMedia = instance.get_config('app_host') + '/_bc/sugo-sdk-js/libs'
      var editor = instance.get_config('editor')
      var filename = typeof window.Vue === 'function' ? 'sugo-editor-lite.min.js' : 'sugo-editor.min.js'
      if (typeof window.Vue !== 'function') {
        filename = editor === 'editor-lite' ? 'sugo-editor-lite.min.js' : 'sugo-editor.min.js'
      }
      // 开发模式
      if (process.env.NODE_ENV !== 'production') {
        siteMedia = '//localhost:4000/build'
        filename = typeof window.Vue === 'function' ? 'editor-lite.js' : 'editor.js'
        if (typeof window.Vue !== 'function') {
          // 有些情况vuejs未加载完已经加载了sdk，所以window.vue判断不出类型
          filename = editor === 'editor-lite' ? 'editor-lite.js' : 'editor.js'
        }
      }

      if (instance.version >= '2.0.0') {
        var iviewCss = siteMedia + '/editor.css'
        that._loadCss(iviewCss)
      }

      if (Config.debug) {
        editorUrl = siteMedia + '/' + filename + cacheBuster
      } else {
        editorUrl = siteMedia + '/' + filename + cacheBuster
      }

      var heatmap = instance.get_config('heatmap')
      that._loadScript(editorUrl, function () {
        setTimeout(function () {
          if (heatmap && editorParams.heatmapType) { // 热图模式
            SugoIO.Global.Editor.heatmap(instance, editorParams)
            return
          }
          SugoIO.Global.Editor.run(instance, editorParams)
        }, 400)
      })
      return true
    }
    return false
  },

  // this is a mechanism to ramp up CE with no server-side interaction.
  // when CE is active, every page load results in a decide request. we
  // need to gently ramp this up so we don't overload decide. this decides
  // deterministically if CE is enabled for this project by modding the char
  // value of the project token.
  enabledForProject: function (token, numBuckets, numEnabledBuckets) {
    numBuckets = !_.isUndefined(numBuckets) ? numBuckets : 10
    numEnabledBuckets = !_.isUndefined(numEnabledBuckets) ? numEnabledBuckets : 10
    var charCodeSum = 0
    for (var i = 0; i < token.length; i++) {
      charCodeSum += token.charCodeAt(i)
    }
    return (charCodeSum % numBuckets) < numEnabledBuckets
  },

  isBrowserSupported: function () {
    // TODO IE8+ 判断
    return typeof document.querySelectorAll !== void 0
  }
}

_.bind_instance_methods(track)
_.safewrap_instance_methods(track)

module.exports = {
  DISABLE_COOKIE: DISABLE_COOKIE,
  track: track
}
