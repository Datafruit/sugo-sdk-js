/**
 * @Author sugo.io<asd>
 * @Date 17-11-17
 */
var _ = require('sugo-sdk-js-utils')['default']
var Logger = require('../logger').get('DOMTracker')

/**
 * @constructor
 */
function DomTracker () {
  this.mp = null
}

// interface
DomTracker.prototype.create_properties = function () {}
DomTracker.prototype.event_handler = function () {}
DomTracker.prototype.after_track_handler = function () {}

DomTracker.prototype.init = function (sugoio_instance) {
  this.mp = sugoio_instance
  return this
}

/**
 * @param {Object|string} query
 * @param {string} event_name
 * @param {Object=} properties
 * @param {function(...[*])=} user_callback
 */
DomTracker.prototype.track = function (query, event_name, properties, user_callback) {
  var that = this
  var elements = _.querySelectorAll(query)

  if (elements.length === 0) {
    Logger.error('The DOM query (' + query + ') returned 0 elements')
    return
  }
  _.each(elements, function (element) {
    _.register_event(element, this.override_event, function (e) {
      var options = {}
      var props = that.create_properties(properties, this)
      var timeout = that.mp.get_config('track_links_timeout')

      that.event_handler(e, this, options)

      // in case the sugoio servers don't get back to us in time
      window.setTimeout(that.track_callback(user_callback, props, options, true), timeout)

      // fire the tracking event
      that.mp.track(event_name, props, that.track_callback(user_callback, props, options))
    })
  }, this)

  return true
}

/**
 * @param {function(...[*])} user_callback
 * @param {Object} props
 * @param {object} options
 * @param {boolean} [timeout_occured]
 */
DomTracker.prototype.track_callback = function (user_callback, props, options, timeout_occured) {
  timeout_occured = timeout_occured || false
  var that = this

  return function () {
    // options is referenced from both callbacks, so we can have
    // a 'lock' of sorts to ensure only one fires
    if (options.callback_fired) { return }
    options.callback_fired = true

    if (user_callback && user_callback(timeout_occured, props) === false) {
      // user can prevent the default functionality by
      // returning false from their callback
      return
    }

    that.after_track_handler(props, options, timeout_occured)
  }
}

DomTracker.prototype.create_properties = function (properties, element) {
  var props

  if (typeof(properties) === 'function') {
    props = properties(element)
  } else {
    props = _.extend({}, properties)
  }

  return props
}

module.exports = DomTracker