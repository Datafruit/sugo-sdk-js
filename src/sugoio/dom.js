/**
 * Created by coin on 30/12/2016.
 */

var exports = module.exports
var _ = require('../utils')._

var tryCatch = _.tryCatch
var doc = document
var body = doc.body
var Node = _.isBrowser() ? window.Node : {}

function $ (selector, context) {
  return (context || body).querySelector(selector)
}

function $$ (selector, context) {
  return (context || body).querySelectorAll(selector)
}

function display (elem, show) {
  return tryCatch(function () {
    elem.style.display = show ? 'block' : 'none'
    return elem
  })()
}

function show (elem) {
  return display(elem, true)
}

function hide (elem) {
  return display(elem, false)
}

function html (elem, html) {
  var length = arguments.length
  return tryCatch(function () {
    if (length === 1) {
      return elem.innerHTML
    } else if (length === 2) {
      elem.innerHTML = html
      return elem
    }
    return elem
  })()
}

function text (elem, text) {
  var length = arguments.length
  return tryCatch(function () {
    if (length === 1) {
      return elem.innerText
    } else if (length === 2) {
      elem.innerText = text
      return elem
    }
    return elem
  })()
}

function style (elem, style) {
  return tryCatch(function () {
    _.each(style, function (val, name) {
      elem.style[name] = _.isNumber(val) ? val + 'px' : val
    })
  })()
}

function addClass (elem, name) {
  return tryCatch(function () {
    if (elem.classList) {
      elem.classList.add(name)
    } else {
      var classNames = elem.className
      if (classNames === '') {
        elem.className = name
      } else {
        var list = classNames.split(/\u0020/)
        if (list.indexOf(name) === -1) {
          list.push(name)
          elem.className = list.join(' ')
        }
      }
    }
    return elem
  })()
}

function removeClass (elem, name) {
  return tryCatch(function () {
    if (elem.classList) {
      elem.classList.remove(name)
    } else {
      var classNames = elem.className
      if (classNames !== '') {
        var list = classNames.split(/\u0020/)
        var i = list.indexOf(name)
        if (i !== -1) {
          list.splice(i, 1)
          elem.className = list.join(' ')
        }
      }
    }
    return elem
  })()
}

function getBoundingClientRect (elem) {
  return tryCatch(function () {
    var attr = ['bottom', 'height', 'left', 'right', 'top', 'width']
    var rect = elem.getBoundingClientRect() || {}
    var result = {}
    attr.forEach(function (name) {
      result[name] = rect[name] === void 0 ? -99999 : rect[name]
    })
    return result
  })()
}

function _getElementBounds (el) {
  var bounds

  // a lot of people use anchor tags to wrap children and make them all linkable
  // (for an example look at the video tiles on youtube.com home page)
  // since anchor tags are display inline by default, we want to calculate the bounds
  // of all of its children. however, we only want to do that when all of the direct
  // children are element nodes (and not text nodes + other children like we do often
  // for icons + text)
  var allChildrenAreElements = el.children.length === el.childNodes.length
  if (el.tagName.toLowerCase() === 'a' && el.children.length > 0 && allChildrenAreElements) {
    Array.from(el.children)
      .filter(function (child) { // filter out elements that are hidden or inline
        var styles = getComputedStyle(child)
        return !(child.tagName === 'a' || styles.display === 'none')
      })
      .forEach(function (child) {
        var b = child.getBoundingClientRect()
        if (!bounds) {
          bounds = {
            top: b.top,
            right: b.right,
            bottom: b.bottom,
            left: b.left
          }
        }
        if (b.top < bounds.top) {
          bounds.top = b.top
        }
        if (b.right > bounds.right) {
          bounds.right = b.right
        }
        if (b.bottom > bounds.bottom) {
          bounds.bottom = b.bottom
        }
        if (b.left < bounds.left) {
          bounds.left = b.left
        }
      })
  } else {
    bounds = el.getBoundingClientRect()
  }

  if (!bounds) {
    bounds = {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    }
  }
  return bounds
}

/**
 * @param el
 * @return {{height: number, left: number, top: number, width: number, right: number, bottom: number}}
 */
function getAbsoluteBoundingClientRect (el) {
  var bb = {
    height: 0,
    left: 0,
    top: 0,
    width: 0,
    right: 0,
    bottom: 0
  }
  var BORDER_WIDTH = 2
  if (el) {
    var bounds = _getElementBounds(el)
    Object.assign(bb, {
      height: bounds.bottom - bounds.top + (BORDER_WIDTH * 2),
      left: (bounds.left + (window.scrollX || window.pageXOffset) - BORDER_WIDTH),
      top: (bounds.top + (window.scrollY || window.pageYOffset) - BORDER_WIDTH),
      width: bounds.right - bounds.left + (BORDER_WIDTH * 2),
      bottom: bounds.bottom + (window.scrollY || window.pageYOffset) - BORDER_WIDTH,
      right: bounds.right + (window.scrollX || window.pageXOffset) - BORDER_WIDTH
    })
  }

  return bb
}

function remove (elem, child) {
  return tryCatch(function () {
    elem.removeChild(child)
    return elem
  })()
}

function append (elem, child) {
  return tryCatch(function () {
    elem.appendChild(child)
    return elem
  })()
}

function attr (elem, name, value) {
  return tryCatch(function () {
    if (value === void 0)
      return elem.getAttribute(name)
    return elem.setAttribute(name, value)
  })()
}

function isNode (any) {
  var result = false
  tryCatch(function () {
    result = any.nodeType === Node.ELEMENT_NODE
  })()
  return result
}

function shiftHostPageDown (hostElements) {
  var HEADER_HEIGHT = 65
  // The goal is to move the entire page down by the height of the control bar
  // so that it doesn't cover anything. For pages with no absolute or fixed positioning,
  // padding works fine. However, we also need to adjust for absolutely positioned elements
  //
  // NOTE: This should be executed before we load the editor since it iterates all elements on the page
  // update body padding to allow room for the header
  //  var bodyCss = getComputedStyle(document.body)
  //  var newPaddingTop = (parseInt(bodyCss['padding-top'], 10) || 0) + HEADER_HEIGHT
  //  document.body.style.cssText += '; padding-top:' + newPaddingTop + 'px !important; transition: padding 300ms cubic-bezier(0, 0, 0, 0.97);'

  var hasAncestor = function hasAncestor (el, cssProp, vals) {
    for (var curEl = el.parentNode; curEl.parentNode; curEl = curEl.parentNode) {
      var parentCss = getComputedStyle(curEl)
      if ((vals.includes && vals.includes(parentCss[cssProp])) || _.includes(vals, parentCss[cssProp])) {
        return true
      }
    }
    return false
  }

  Array.from(hostElements).forEach(function (el) {
    var css = getComputedStyle(el)
    if (css.position === 'fixed' || css.position === 'absolute' && !hasAncestor(el, 'position', ['absolute', 'fixed', 'relative'])) {
      var origBodyStyles = document.body.style.cssText
      var origElBounds = el.getBoundingClientRect()
      document.body.style['padding-top'] = (parseInt(document.body.style['padding-top'], 10) || 0) + 1 + 'px'
      var newElBounds = el.getBoundingClientRect()
      document.body.style.cssText = origBodyStyles
      if (origElBounds.top === newElBounds.top) {
        var newTop = (parseInt(css.top, 10) || 0) + HEADER_HEIGHT
        el.style.cssText += '; top:' + newTop + 'px !important; transition: top 500ms ease-out;'
      }
    }
  })
}

/**
 * @param {number} position
 * @return {number}
 * @see https://dom.spec.whatwg.org/#dom-document-compatmode
 * @see https://drafts.csswg.org/cssom-view/#dom-element-scrolltop
 */
function scrollToTop (position) {
  if (document.compatMode === 'CSS1Compat') {
    return document.documentElement.scrollTop = position
  }
  return document.body.scrollTop = position
}

exports.doc = doc
exports.body = body
exports.$ = $
exports.$$ = $$
exports.display = display
exports.show = show
exports.hide = hide
exports.html = html
exports.text = text
exports.style = style
exports.addClass = addClass
exports.removeClass = removeClass
exports.getBoundingClientRect = getBoundingClientRect
exports.getAbsoluteBoundingClientRect = getAbsoluteBoundingClientRect
exports.remove = remove
exports.append = append
exports.attr = attr
exports.isNode = isNode
exports.shiftHostPageDown = shiftHostPageDown
exports.scrollToTop = scrollToTop
