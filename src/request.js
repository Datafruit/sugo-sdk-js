/**
 * @Author sugo.io<asd>
 * @Date 17-11-14
 * @description 兼容跨域方案
 */

var _ = require('./utils')._
var logger = require('./logger').get()

var XMLHttpRequestCORS = typeof XMLHttpRequest !== void 0 && 'withCredentials' in new XMLHttpRequest()
// XDomainRequest only work in ie8+
// https://hsivonen.fi/doctype/#ie8modes
// ie默认使用的是兼容模式，即ie7，所以在ie8与ie9下userAgent均为MSIE7
var XDomainRequestCORS = typeof XDomainRequest !== void 0 && navigator.userAgent.indexOf('MSIE') > 0 && parseInt(navigator.userAgent.match(/MSIE ([\d.]+)/)[1], 10) >= 7

if (XMLHttpRequestCORS) {
  logger.info('Support XMLHttpRequestCORS')
}

if (XDomainRequestCORS) {
  logger.info('Support XDomainRequestCORS')
}

if (!XMLHttpRequestCORS && !XDomainRequestCORS) {
  logger.warn('Not Support CORS. Sugoio will not work if your domain diff with config.api_host')
}

function parse (resp) {
  var result
  try {
    result = _.JSONDecode(resp)
  } catch (e) {
    result = resp
  }
  return result
}

/**
 * @typedef {Object} RequestHooksStruct
 * @property {function(method:string, url:string, data:*): RequestHooksStruct} send
 * @property {function(callback:function): RequestHooksStruct} success
 * @property {function(callback:function): RequestHooksStruct} error
 */

/**
 * @return {RequestHooksStruct}
 */
function createXMLHttpRequestCORS () {
  var xhr = new XMLHttpRequest()
  var callbacks = {
    success: null,
    error: null
  }
  var hooks = {
    send: function (method, url, data) {
      xhr.open(method, url)
      xhr.withCredentials = false
      xhr.onreadystatechange = function () {
        var res
        if (xhr.readyState === 4) {
          res = parse(xhr.responseText)
          if (xhr.status >= 200 && xhr.status < 300) {
            if (callbacks.success) {
              callbacks.success(res)
            }
          } else {
            if (callbacks.error) {
              callbacks.error(res)
            }
          }
        }
      }
      xhr.send(data || null)
      return hooks
    },
    success: function (callback) {
      callbacks.success = callback
      return hooks
    },
    error: function (callback) {
      callbacks.error = callback
      return hooks
    }
  }
  return hooks
}

/**
 * @return {RequestHooksStruct}
 */
function createXDomainRequestCORS () {
  var xdr = new XDomainRequest()
  var callbacks = {
    success: null,
    error: null
  }
  var hooks = {
    send: function (method, url, data) {
      xdr.open(method, url)
      xdr.onload = function () {
        if (callbacks.success) {
          callbacks.success(parse(xdr.responseText))
        }
      }
      xdr.onerror = function (err) {
        if (callbacks.error) {
          callbacks.error(err)
        }
      }
      xdr.ontimeout = function () {}
      xdr.onprogress = function () {}
      setTimeout(function () {
        xdr.send(data || null)
      }, 0)
      return hooks
    },
    success: function (callback) {
      callbacks.success = callback
    },
    error: function (callback) {
      callbacks.error = callback
    }
  }
  return hooks

}

/** @type {RequestHooksStruct} */
var Fake = {
  send: function () { return Fake },
  success: function () { return Fake },
  error: function () { return Fake }
}

/**
 * @return {RequestHooksStruct}
 */
module.exports = function () {
  if (XMLHttpRequestCORS) {
    return createXMLHttpRequestCORS()
  }

  if (XDomainRequestCORS) {
    return createXDomainRequestCORS()
  }

  // not support CORS
  return Fake
}

