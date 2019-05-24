/**
 * @Author sugo.io<asd>
 * @Date 17-11-18
 */

var _ = require('sugo-sdk-js-utils')['default']

function doScrollCheck (callback) {
  try {
    document.documentElement.doScroll('left')
  } catch (e) {
    return setTimeout(function () {
      doScrollCheck(callback)
    }, 100)
  }
}

module.exports = function (callback) {

  function handle () {
    if (handle.done) {
      return
    }
    handle.done = true
    callback()
  }

  if (document.addEventListener) {
    if (document.readyState === 'complete') {
      // safari 4 can fire the DOMContentLoaded event before loading all
      // external JS (including this file). you will see some copypasta
      // on the internet that checks for 'complete' and 'loaded', but
      // 'loaded' is an IE thing
      handle()
    } else {
      document.addEventListener('DOMContentLoaded', handle, false)
    }
  } else if (document.attachEvent) {
    // IE
    document.attachEvent('onreadystatechange', handle)

    // check to make sure we arn't in a frame
    var toplevel = false
    try {
      toplevel = window.frameElement === null
    } catch (e) {
      // noop
    }

    if (document.documentElement.doScroll && toplevel) {
      doScrollCheck(handle)
    }
  }

  // fallback handler, always will work
  _.register_event(window, 'load', handle, true)
}
