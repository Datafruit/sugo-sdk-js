/**
 * @Author sugo.io<asd>
 * @Date 17-11-17
 */

var DomTracker = require('./DomTracker')
var _ = require('sugo-sdk-js-utils')['default']

/**
 * FormTracker Object
 * @varructor
 * @extends DomTracker
 */
var FormTracker = function () {
  this.override_event = 'submit'
}
_.inherit(FormTracker, DomTracker)

FormTracker.prototype.event_handler = function (evt, element, options) {
  options.element = element
  evt.preventDefault()
}

FormTracker.prototype.after_track_handler = function (props, options) {
  setTimeout(function () {
    options.element.submit()
  }, 0)
}

module.exports = FormTracker