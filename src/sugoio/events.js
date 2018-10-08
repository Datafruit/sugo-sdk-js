/**
 * Created by coin on 30/12/2016.
 */

var exports = module.exports
var _ = require('../utils')._
var doc = require('./dom').doc

function uuid () {
  return 'sugo_' + _.UUID().replace(/-/g, '_')
}

var MARK = { LISTENER: uuid() }
var CssSelectorType = {
  ID: /(?:^#\w+$)/,
  // .a 或 .a.b..
  CLASS: /(?:\.\w+)+/,
  // tagName
  TAG: /(?:[a-zA-z]+)/
}

var Hooks = {
  type: function (selector) {
    var type = null
    _.each(CssSelectorType, function (r, t) {
      return r.test(selector) && (type = t)
    })
    return type
  },

  isSelector: function (node, selector) {
    if (!selector) {
      return true
    }
    var handle = Hooks.hooks[this.type(selector)]
    return _.isFunction(handle) ? handle(node, selector) : true
  },

  hooks: {
    /**
     * @private
     * @return {boolean}
     */
    ID: function (node, str) {
      return node.getAttribute('id') === str
    },

    /**
     * @private
     * @return {boolean}
     */
    CLASS: function (node, str) {
      var classList = node.classList
      if (!classList) {
        classList = node.getAttribute('class')
        classList = classList ? classList.split(' ') : []
      }

      var matchClassNames = str.split('.').splice(1)

      return matchClassNames.some(function (className) {
        return classList.indexOf(className) !== -1
      })
    },

    /**
     * @private
     * @return {boolean}
     */
    TAG: function (node, str) {
      return node.tagName.toLocaleLowerCase() === str.toLocaleLowerCase()
    }
  }
}

function on_base (node, type, handle, capture) {
  node.addEventListener(type, handle, !!capture)
  return node
}

function off_base (node, type, handle, capture) {
  node.removeEventListener(type, handle, !!capture)
  return node
}

function on (node, type, selector, handle, data) {
  const listener_attr = node[MARK.LISTENER] || (node[MARK.LISTENER] = {})
  const listener = listener_attr[type] || (listener_attr[type] = [])

  listener.push(handle)

  on_base(node, type, function (e) {
    var target = closest(e.target, selector)
    if (target) {
      handle.call(target, e, target, data)
    }
  }, false)
}

function off (node, type, handle) {
  const listener_attr = node[MARK.LISTENER] || (node[MARK.LISTENER] = {})

  // off()
  if (arguments.length === 0) {
    type = handle = null
  }
  // off('click')
  else if (arguments.length === 1) {
    handle = null
  }

  if (type === null) {
    _.each(listener_attr, function (_type, handles) {
      _.each(handles, function (_handle) {
        off(node, _type, _handle, false)
      })
    })
  } else {
    if (handle === null) {
      handle = listener_attr[type]
    } else {
      handle = _.isArray(handle) ? handle : [handle]
    }

    _.each(handle, function (handle) {
      off_base(node, type, handle, false)
    })
  }
}

function closest (node, selector) {

  if (!selector) {
    return node
  }

  if (node.closest) {
    return node.closest(selector)
  }

  while (node !== doc && !Hooks.isSelector(node, selector)) {
    node = node.parentNode
  }

  return node === doc ? null : node
}

/**
 * from jquery-1.9.1
 */
function contains (a, b) {
  var c = a.nodeType === 9 ? a.documentElement : a

  return a === b || !!(b && b.nodeType === 1 && (
      c.contains
        ? c.contains(b)
        : a.compareDocumentPosition && a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_CONTAINED_BY
    ))
}

exports.on_base = on_base
exports.off_base = off_base
exports.on = on
exports.off = off
exports.closest = closest
exports.contains = contains
