/*!
 * sugo-sdk-javascript JavaScript Lib v1.3.13
 * http://sugo.io
 * Date: 2017-11-28
 */

var SUGOIO_LIB_URL = '//localhost:8000/_bc/sugo-sdk-js/libs/sugoio-latest.min.js';

(function (document, sugoio) {
  // Only stub out if this is the first time running the snippet.
  if (sugoio.__SV) return

  var win = window
  var script
  var first_script
  var functions
  var lib_name = 'sugoio'

  win[lib_name] = sugoio

  try {
    store(win.location.hash.replace('#', ''))
  } catch (e) {
  } finally {
    capture(sugoio)
  }

  /**
   * 保存参数到session
   * 此处代码不必支持ie8
   * @param {string} base64
   */
  function store (base64) {
    var str = win.atob(base64)
    var json = JSON.parse(str)
    var state = json.state
    var params = {
      accessToken: state.access_token,
      accessTokenExpiresAt: Date.now() + Number(state.expires_in) * 1000,
      projectToken: state.token,
      projectId: state.project_id,
      userId: state.user_id,
      choosePage: state.choose_page
    }
    // 存入参数
    win.sessionStorage.setItem('editorParams', JSON.stringify(params))

    // 还原用户原有hash
    if (state['hash']) {
      win.location.hash = state['hash']
    } else if (win.history) {
      win.history.replaceState('', document.title, win.location.pathname + win.location.search) // completely remove hash
    } else {
      win.location.hash = '' // clear hash (but leaves # unfortunately)
    }
  }

  /**
   * 兼容ie事件绑定
   * @param {Element} target
   * @param {string} type
   * @param {Function} handle
   */
  function listen (target, type, handle) {
    if (typeof target.addEventListener === 'function') {
      return target.addEventListener(type, handle, true)
    }
    return target.attachEvent('on' + type, handle)
  }

  /**
   * @param {Array} arr
   * @param {Function} iterator
   */
  function forEach (arr, iterator) {
    for (var i = 0, len = arr.length; i < len; i++) {
      iterator(arr[i], i, arr)
    }
  }

  /**
   * 代理所有事件到document上，以便埋点代码控制
   * 埋点代碼可以重寫hooks[name]
   * 为了优先级，一律使用捕获模型
   * @param {Object} target
   * @example
   * sugoio.proxy('focus', function(event){
   *   if (event.target is SDK children) {
   *     event.stopPropagation()
   *   }
   * })
   *
   * sugoio.off('focus', function reference)
   */
  function capture (target) {
    var hooks = {}
    var doc = document
    var events = ('blur focus focusin focusout load resize scroll unload click dblclick ' +
    'mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave ' +
    'change select submit keydown keypress keyup error contextmenu').split(' ')

    target.proxy = {
      proxy: proxy,
      off: off
    }

    forEach(events, function (type) {
      hooks[type] = []
      listen(doc, type, function (event) {
        try {
          forEach(hooks[type], function (handle) {
            handle(event)
          })
        } catch (e) {
          if (console && typeof console.error === 'function') {
            console.error(e.stack)
          }
        }
      })
    })

    /**
     * 代理事件
     * @param {string} type
     * @param {Function} handle
     */
    function proxy (type, handle) {
      var listeners = hooks[type] || (hooks[type] = [])
      listeners.push(handle)
      return target.proxy
    }

    /**
     *
     * @param type
     * @param handle
     * @return {proxy}
     */
    function off (type, handle) {
      var listeners = hooks[type] || []
      var next = []

      forEach(listeners, function (fn) {
        if (fn !== handle) {
          next.push(fn)
        }
      })

      listeners[type] = next

      return target.proxy
    }
  }

  // initialize
  sugoio._i = []
  sugoio.init = function (token, config, name) {
    // support multiple sugoio instances
    var target = sugoio
    if (typeof(name) !== 'undefined') {
      target = sugoio[name] = []
    } else {
      name = lib_name
    }

    // Pass in current people object if it exists
    target.people = target.people || []
    target.toString = function (no_stub) {
      var str = lib_name
      if (name !== lib_name) {
        str += '.' + name
      }
      if (!no_stub) {
        str += ' (stub)'
      }
      return str
    }

    target.people.toString = function () {
      // 1 instead of true for minifying
      return target.toString(1) + '.people (stub)'
    }

    function _set_and_defer (target, fn) {
      var split = fn.split('.')
      if (split.length === 2) {
        target = target[split[0]]
        fn = split[1]
      }
      target[fn] = function () {
        target.push([fn].concat(Array.prototype.slice.call(arguments, 0)))
      }
    }

    // 删除无用的shallow
    // create shallow clone of the public sugoio interface
    functions = "time_event track track_pageview register register_once unregister set_config".split(' ')

    forEach(functions, function (fn) {
      _set_and_defer(target, fn)
    })

    // register sugoio instance
    sugoio._i.push([token, config, name])
  }

  // Snippet version, used to fail on new features w/ old snippet
  sugoio.__SV = 1.2

  script = document.createElement("script")
  script.type = "text/javascript"
  script.async = true

  if (typeof SUGOIO_CUSTOM_LIB_URL !== 'undefined') {
    script.src = SUGOIO_CUSTOM_LIB_URL
  } else if (win.location.protocol === 'file:' && SUGOIO_LIB_URL.match(/^\/\//)) {
    script.src = 'https:' + SUGOIO_LIB_URL
  } else {
    script.src = SUGOIO_LIB_URL
  }

  first_script = document.getElementsByTagName("script")[0]
  first_script.parentNode.insertBefore(script, first_script)

})(document, window.sugoio || [])
