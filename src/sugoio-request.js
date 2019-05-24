var _ = require('./utils')._
var sgRequest = module.exports
var config = {
  withCredentials: true,
  contentType: 'application/json',
  headers: []
}

var parse = function (req) {
  var result
  try {
    result = _.JSONDecode(req.responseText)
  } catch (e) {
    result = req.responseText
  }
  return [result, req]
}

var xhr = function (type, url, data) {
  var methods = {
    success: function () {},
    error: function () {},
    always: function () {}
  }
  var XHR = window.XMLHttpRequest || window.ActiveXObject
  var request = new XHR('MSXML2.XMLHTTP.3.0')
  request.open(type, url, true)
  request.withCredentials = true
  request.setRequestHeader('content-type', config.contentType)
  if (config.headers.length > 0) {
    _.each(config.headers, function (o) {
      request.setRequestHeader(o.key, o.value)
    })
  }
  request.onreadystatechange = function () {
    var req
    if (request.readyState === 4) {
      req = parse(request)
      if (request.status >= 200 && request.status < 300) {
        methods
          .success
          .apply(methods, req)
      } else {
        methods
          .error
          .apply(methods, req)
      }
      methods
        .always
        .apply(methods, req)
    }
  }
  request.send(data)
  var resXHR = {
    success: function (callback) {
      methods.success = callback
      return resXHR
    },
    error: function (callback) {
      methods.error = callback
      return resXHR
    },
    always: function (callback) {
      methods.always = callback
      return resXHR
    }
  }
  return resXHR
}
sgRequest.get = function (src) {
  return xhr('GET', src)
}
sgRequest.put = function (url, data) {
  return xhr('PUT', url, data)
}
sgRequest.post = function (url, data) {
  return xhr('POST', url, data)
}
sgRequest['delete'] = function (url) {
  return xhr('DELETE', url)
}
sgRequest.setContentType = function (value) {
  config.contentType = value
}
sgRequest.setRequestHeader = function (key, value) {
  config.headers.push({ key: key, value: value })
}


