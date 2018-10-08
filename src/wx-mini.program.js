// 微信小程序sdk上报

let GlOBAL_CONFIG = {
  project_id: '',                                 // 项目ID
  token: '',                                      // 项目token
  api_host: '',                                   // 拉取维度服务器地址
  gateway_host: '',                               // 数据上报网关地址
  prefix: '_sugoio_',
  dimPrefix: '_sugoio_dimensions_',
  version: '1.0.0',
  track_share_app: false,                         // 转发
  track_pull_down_fresh: false,                   // 下拉
  track_reach_bottom: false,                      // 上拉
  track_auto_duration: true,
  debug: false
}

const SUGO_EVENT_TIME_KEY = 'sugo_event_time'
const SUGO_REGISTER_KEY = 'sugo_register'

function getNetworkType(callbak) {
  wx.getNetworkType({
    success: function (res) {
      callbak(res.networkType)
    }
  })
}

function getSystemInfo() {
  const info = wx.getSystemInfoSync()
  return {
    device_brand: encodeURIComponent(info.brand),
    device_model: encodeURIComponent(info.model),
    system_name: encodeURIComponent(info.platform),
    system_version: info.system,
    app_name: 'wx-mini-program',
    app_version: info.version,
    screen_dpi: info.pixelRatio,
    // screen_height: info.screenHeight,
    // screen_width: info.screenWidth
    screen_pixel: `${info.screenWidth}*${info.screenHeight}`
  }
}

function getUID() {
  try {
    return wx.getStorageSync(GlOBAL_CONFIG.prefix + 'auid')
  } catch (e) {
    // console.log(e)
  }
}

function setUID() {
  try {
    const uid = sugoio._.shortid()
    wx.setStorageSync(GlOBAL_CONFIG.prefix + 'auid', uid)
    return uid
  } catch (e) {
    // console.log(e)
  }
}

function getPagePath() {
  try {
    let pages = getCurrentPages(), path = '/'
    0 < pages.length && (path = pages.pop().__route__)
    return path
  } catch (e) {
    console.log('get current page path error:' + e)
  }
}

function timestamp() {
  Date.now = Date.now || function () {
    return +new Date()
  }
  return Date.now()
}

function getMainInfo() {
  let info = {
    //page_name
    //path_name
    //event_id
    //event_name
    //event_type
    //session_id
    event_time: timestamp(),
    sugo_lib: 'wechat.mini',
    // current_url: getPagePath(),
    path_name: getPagePath()
  }
  info.distinct_id = function () {
    let uid = getUID()
    uid || (uid = setUID())
    return uid
  }()
  return info
}

function getBasicInfo() {
  const info = getSystemInfo()
  getNetworkType(function (network) {
    try {
      wx.setStorageSync(GlOBAL_CONFIG.prefix + 'network', network)
    } catch (e) {
      // console.log(e)
    }
  })
  info.network = wx.getStorageSync(GlOBAL_CONFIG.prefix + 'network') || '4g'
  return info
}

function getExtentInfo() {
  let userInfo = sugoio.Data.userInfo
  let infos = [], key
  for (key in userInfo) userInfo.hasOwnProperty(key) && infos.push(key + '=' + userInfo[key])
  userInfo = infos.join(';')
  return {
    app_name: 'wx' //,
    // ext: 'v=' + DEF_CONFIG.version + (null !== userInfo && '' !== userInfo ? ';ui=' + encodeURIComponent(userInfo) : '')
  }
}

function setServerDimensions() {
  let uri = GlOBAL_CONFIG.api_host + '/api/sdk-wx-mini/dimensions?'
    + 'app_version=' + GlOBAL_CONFIG.app_version
    + '&project_id=' + GlOBAL_CONFIG.project_id
    + '&token=' + GlOBAL_CONFIG.token
  wx.request({
    url: uri,
    success: function (res) {
      try {
        wx.setStorageSync(GlOBAL_CONFIG.dimPrefix + GlOBAL_CONFIG.token, res.data.result)
      } catch (e) {
        // console.log(e)
      }
    }
  })
}

function getServerDimensions() {
  try {
    return wx.getStorageSync(GlOBAL_CONFIG.dimPrefix + GlOBAL_CONFIG.token)
  } catch (e) {
    // console.log(e)
  }
}

function removeEventTime(eventName) {
  try {
    let eventTimeObj = wx.getStorageSync(SUGO_EVENT_TIME_KEY)
    const res = eventTimeObj ? eventTimeObj[eventName] : 0
    if (res) {
      delete eventTimeObj[eventName]
      wx.setStorageSync(SUGO_EVENT_TIME_KEY, eventTimeObj)
    }
    return res || ''
  } catch (e) {
    // console.log(e)
  }
}

function setRegisterObj(obj, once) {
  let oldRegisterObj = wx.getStorageSync(SUGO_REGISTER_KEY)
  let newRegisterObj = {}
  if (once) {
    newRegisterObj = {
      ...obj,
      ...oldRegisterObj
    }
  } else {
    newRegisterObj = {
      ...oldRegisterObj,
      ...obj
    }
  }
  try {
    wx.setStorageSync(SUGO_REGISTER_KEY, newRegisterObj)
  } catch (e) {
    // console.log(e)
  }
}

function getRegisterObj() {
  try {
    return wx.getStorageSync(SUGO_REGISTER_KEY)
  } catch (e) {
    // console.log(e)
  }
}

function removeRegister(key) {
  let oldRegisterObj = wx.getStorageSync(SUGO_REGISTER_KEY)
  if (oldRegisterObj[key]) {
    delete oldRegisterObj[key]
    try {
      wx.setStorageSync(SUGO_REGISTER_KEY, oldRegisterObj)
    } catch (e) {
      // console.log(e)
    }
  }
}

const sugoio = {
  _: {
    isArray: Array.isArray || function (obj) {
      return Object.prototype.toString.call(obj) === '[object Array]'
    },
    isObject: (obj) => {
      return (Object.prototype.toString.call(obj) === '[object Object]') && (obj != null)
    },
    has: (obj, key) => {
      // obj 不能为 null 或者 undefined
      return obj !== null && hasOwnProperty.call(obj, key)
    },
    shortid: () => {
      let d = new Date().getTime()
      const result = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (d + Math.random() * 16) % 16 | 0
        d = Math.floor(d / 16)
        return (c === 'x' ? r : (r & 0x7 | 0x8)).toString(16)
      })
      return result
    },
    encode: (dimensions, serverDimensions) => {
      if (!serverDimensions || serverDimensions.length < 1) {
        return null
      }
      const EVENTS_MAPS = {
        click: '点击',
        change: '改变',
        // submit: '提交',
        focus: '对焦',
        view: '浏览',
        duration: '停留',
        pageloading: '加载',
        first_visit: '首次访问',
        first_login: '首次登录'
      }
      const HEADER_SPLIT = '\x02' //\002
      const CONTENT_SPLIT = '\x01' //\001
      const DRUID_COLUMN_TYPE = { 0: 'l', 1: 'f', 2: 's', 3: 's', 4: 'd', 5: 'i', 6: 's', 7: 'f', 8: 'f' }
      let keys = [], vals = [], removeDimensions = []
      for (const dim in dimensions) {
        const exists = serverDimensions.find(function (ser) { return ser.name === dim })
        if (exists) {
          keys.push(DRUID_COLUMN_TYPE[exists.type] + '|' + dim)
          const val = dim === 'event_type' ? EVENTS_MAPS[dimensions[dim]] : dimensions[dim]
          vals.push(val)
        } else {
          removeDimensions.push(dim)
        }
      }
      return {
        data: keys.join(',') + HEADER_SPLIT + vals.join(CONTENT_SPLIT),
        removeDimensions
      }
    },
    utf8Encode: (string) => {
      string = (string + '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
      var utftext = '', start, end
      var stringl = 0, n
      start = end = 0
      stringl = string.length
      for (n = 0; n < stringl; n++) {
        var c1 = string.charCodeAt(n)
        var enc = null
        if (c1 < 128) {
          end++
        } else if ((c1 > 127) && (c1 < 2048)) {
          enc = String.fromCharCode((c1 >> 6) | 192, (c1 & 63) | 128)
        } else {
          enc = String.fromCharCode((c1 >> 12) | 224, ((c1 >> 6) & 63) | 128, (c1 & 63) | 128)
        }
        if (enc !== null) {
          if (end > start) {
            utftext += string.substring(start, end)
          }
          utftext += enc
          start = end = n + 1
        }
      }
      if (end > start) {
        utftext += string.substring(start, string.length)
      }
      return utftext
    },
    base64Encode: (data) => {
      var b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
      var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, enc = '', tmp_arr = []
      if (!data) {
        return data
      }
      data = sugoio._.utf8Encode(data)
      do { // pack three octets into four hexets
        o1 = data.charCodeAt(i++)
        o2 = data.charCodeAt(i++)
        o3 = data.charCodeAt(i++)
        bits = o1 << 16 | o2 << 8 | o3
        h1 = bits >> 18 & 0x3f
        h2 = bits >> 12 & 0x3f
        h3 = bits >> 6 & 0x3f
        h4 = bits & 0x3f
        // use hexets to index into b64, and append result to encoded string
        tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4)
      } while (i < data.length)
      enc = tmp_arr.join('')
      switch (data.length % 3) {
        case 1:
          enc = enc.slice(0, -2) + '=='
          break
        case 2:
          enc = enc.slice(0, -1) + '='
          break
      }
      return enc
    }
  },
  App: {
    init: (opts) => {
      if (!('api_host' in opts) || !('gateway_host' in opts) || !opts.project_id || !opts.token) {
        throw new Error('project_id, token, api_host, gateway_host为必设参数.')
      }
      const systemInfo = getSystemInfo()
      GlOBAL_CONFIG = {
        ...GlOBAL_CONFIG,
        ...opts,
        app_version: systemInfo.app_version
      }
      setServerDimensions()
    }
  },
  Page: {
    init: () => {
      setServerDimensions()
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      currentPage.onShow && !function () {
        var func = currentPage.onShow
        currentPage.onShow = function () {
          sugoio.track('浏览', {
            // current_url: currentPage.__route__,
            event_type: 'view'
          })
          if (GlOBAL_CONFIG.track_auto_duration) {
            sugoio.time_event('停留')
          }
          func.call(this, arguments)
        }
      }()

      GlOBAL_CONFIG.track_auto_duration && currentPage.onHide && !function () {
        const func = currentPage.onHide
        currentPage.onHide = function () {
          sugoio.track('停留', {})
          func.call(this, arguments)
        }
      }()

      GlOBAL_CONFIG.track_pull_down_fresh && currentPage.onPullDownRefresh && ! function () {
        const func = currentPage.onPullDownRefresh
        currentPage.onPullDownRefresh = function () {
          sugoio.track(GlOBAL_CONFIG.prefix + 'pulldownfresh', {
            // current_url: currentPage.__route__,
            event_type: 'onPullDownRefresh'
          })
          func.call(this, arguments)
        }
      }()
      GlOBAL_CONFIG.track_reach_bottom && currentPage.onReachBottom && ! function () {
        const func = currentPage.onReachBottom
        currentPage.onReachBottom = function () {
          sugoio.track(GlOBAL_CONFIG.prefix + 'reachbottom', {
            // current_url: currentPage.__route__,
            event_type: 'onReachBottom'
          })
          func.call(this, arguments)
        }
      }()
      GlOBAL_CONFIG.track_share_app && currentPage.onShareAppMessage && ! function () {
        const func = currentPage.onShareAppMessage
        currentPage.onShareAppMessage = function () {
          sugoio.track(GlOBAL_CONFIG.prefix + 'shareapp', {
            // current_url: currentPage.__route__,
            event_type: 'onShareAppMessage'
          })
          return func.call(this, arguments)
        }
      }()
    }
  },
  track: (event_name, properties, callback) => {
    let results = [], mainInfo = getMainInfo(), extInfo = getExtentInfo(), basicInfo = getBasicInfo()
    mainInfo.event_type = properties.event_type || 'click'
    mainInfo.event_name = event_name
    mainInfo.event_id = GlOBAL_CONFIG.event_id || sugoio._.shortid()
    mainInfo.token = GlOBAL_CONFIG.token
    let props = 'undefined' === typeof properties ? {} : properties
    for (const k in props) {
      mainInfo[k] = props[k]
    }
    for (const k in extInfo) {
      mainInfo[k] = extInfo[k]
    }
    for (const k in basicInfo) {
      mainInfo[k] = basicInfo[k]
    }

    // 处理停留时间
    var start_timestamp = removeEventTime(event_name)
    if (start_timestamp) {
      const duration_in_ms = new Date().getTime() - start_timestamp
      mainInfo.duration = parseFloat((duration_in_ms / 1000).toFixed(2))
      mainInfo.event_type = 'duration' //增加停留事件类型
    }

    // 处理register
    const registerObj = getRegisterObj()
    if (registerObj) {
      mainInfo = {
        ...mainInfo,
        ...registerObj
      }
    }

    results = [
      'locate=' + GlOBAL_CONFIG.project_id,
      'token=' + GlOBAL_CONFIG.token
    ]
    const serverDimensions = getServerDimensions()
    if (!serverDimensions) {
      console.log('track faild: no server dimenions')
      return
    }
    const res = sugoio._.encode(mainInfo, serverDimensions)
    if (!res) {
      console.log('track failed: empty encode data')
      return
    }
    
    if (GlOBAL_CONFIG.debug) {
      console.log('reportData:', mainInfo)
    }

    const data = sugoio._.base64Encode(res.data)
    if (res.removeDimensions.length) {
      console.log('warn: excluded dimensions =>', res.removeDimensions)
    }

    wx.request({
      url: `${GlOBAL_CONFIG.gateway_host}/post?${results.join('&')}`,
      method: 'post',
      data,
      header: {
        'content-type': 'text/plain;charset=UTF-8'
      },
      complete: function () {
        if (callback) {
          callback()
        }
      }
    })
  },
  Data: {
    userInfo: null,
    lanchInfo: null
  },
  time_event: (eventName) => {
    try {
      return wx.setStorageSync(SUGO_EVENT_TIME_KEY, {
        [eventName]: new Date().getTime()
      })
    } catch (e) {
      // console.log(e)
    }
  },
  register_once: (obj) => {
    setRegisterObj(obj, true)
  },
  register: (obj) => {
    setRegisterObj(obj, false)
  },
  unregister: (key) => {
    removeRegister(key)
  }
}

module.exports = sugoio
