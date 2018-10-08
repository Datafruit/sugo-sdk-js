/**
 * @Author sugo.io<asd>
 * @Date 17-9-13
 */

var base = require('./base')
var _ = require('sugo-sdk-js-utils')['default']

var SHADOW_NODE_CONS = {
  ELEMENT_NODE: 1,
  ATTRIBUTE_NODE: 2,
  TEXT_NODE: 3,
  CDATA_SECTION_NODE: 4,
  ENTITY_REFERENCE_NODE: 5,
  ENTITY_NODE: 6,
  PROCESSING_INSTRUCTION_NODE: 7,
  COMMENT_NODE: 8,
  DOCUMENT_NODE: 9,
  DOCUMENT_TYPE_NODE: 10,
  DOCUMENT_FRAGMENT_NODE: 11,
  NOTATION_NODE: 12,
  DOCUMENT_POSITION_DISCONNECTED: 1,
  DOCUMENT_POSITION_PRECEDING: 2,
  DOCUMENT_POSITION_FOLLOWING: 4,
  DOCUMENT_POSITION_CONTAINS: 8,
  DOCUMENT_POSITION_CONTAINED_BY: 16,
  DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC: 32
}
var NodeConstructor = _.isBrowser() ? window.Node || SHADOW_NODE_CONS : SHADOW_NODE_CONS
var DOMNodePathStep = base.DOMNodePathStep

/**
 * 生成节点的选择器
 * @param {Element} node
 * @param {boolean} optimized - 是否生成最优路径
 * @param {boolean} isTargetNode
 * @return {?DOMNodePathStep}
 */
function selector (node, optimized, isTargetNode) {

  if (node.nodeType !== NodeConstructor.ELEMENT_NODE) {
    return null
  }

  var id = node.getAttribute('id')
  if (optimized && id) {
    return new DOMNodePathStep(node.nodeName.toLowerCase() + base.idSelector(id), true)
  }

  // 如果该元素为Document节点，返回nodeName
  var parent = node.parentNode
  var nodeName = node.nodeName.toLowerCase()

  if (!parent || parent.nodeType === NodeConstructor.DOCUMENT_NODE) {
    return new DOMNodePathStep(nodeName.toLowerCase(), true)
  }
  // 根据兄弟元素确定selector
  var prefixedOwnClassNamesArray = base.prefixedElementClassNames(node)
  var needsClassNames = false
  var needsNthChild = false
  var ownIndex = -1
  var siblings = parent.children
  var i = 0

  // 如果需要生成最优路径，遍历所有的兄弟元素，规则如下
  // 1. 若兄弟元素与节点名称相同，则需要用class来区分，标识needsClassNames=true
  // 2. 如果节点没有class，则需要用元素位置来区分，标识needsNthChild=true
  // 3. 如果节点有class，遍历兄弟元素的class，如果节点class与兄弟元素class重复
  //      依然需要元素位置来区分，标识needsNthChild=true
  if (optimized) {
    for (i = 0; (ownIndex === -1 || !needsNthChild) && i < siblings.length; ++i) {
      var sibling = siblings[i]
      if (sibling === node) {
        ownIndex = i
        continue
      }
      if (needsNthChild) {
        continue
      }
      if (sibling.nodeName.toLowerCase() !== nodeName.toLowerCase()) {
        continue
      }

      needsClassNames = true
      var ownClassNames = prefixedOwnClassNamesArray
      var ownClassNameCount = 0
      for (var cn_idx = 0; cn_idx < ownClassNames.length; cn_idx++) {
        ++ownClassNameCount
      }
      if (ownClassNameCount === 0) {
        needsNthChild = true
        continue
      }
      var siblingClassNamesArray = base.prefixedElementClassNames(sibling)
      for (var j = 0; j < siblingClassNamesArray.length; ++j) {
        var siblingClass = siblingClassNamesArray[j]
        var o_idx = _.indexOf(ownClassNames, siblingClass)
        if (o_idx === -1) {
          continue
        }
        ownClassNames.splice(o_idx, 1)
        if (!--ownClassNameCount) {
          needsNthChild = true
          break
        }
      }
    }
  } else if (siblings.length > 1) {
    // 如果不需要生成最优路径，则全部使用nth-child描述
    for (i = 0; i < siblings.length; i++) {
      if (siblings[i] === node) {
        ownIndex = i
        needsNthChild = true
        break
      }
    }
  }

  // 生成selector
  // 1. 如果节点为input，并带有type属性、节点没有id、没有class，则需要标识节点的type类型
  // 2. 如果needsNthChild为true，则需要生成:nth-child
  // 3. 如果需要class标识，则需要生成class
  var result = nodeName.toLowerCase()
  if (isTargetNode && nodeName.toLowerCase() === 'input' &&
    node.getAttribute('type') &&
    !node.getAttribute('id') &&
    !node.getAttribute('class')) {
    result += '[type=\"' + node.getAttribute('type') + '\"]'
  }

  if (needsNthChild) {
    result += ':nth-child(' + (ownIndex + 1) + ')'
  } else if (needsClassNames) {
    for (var idx = 0; idx < ownClassNames.length; idx++) {
      result += '.' + base.escapeIdentifierIfNeeded(ownClassNames[idx].substr(1))
    }
  }

  return new DOMNodePathStep(result, false)
}

/**
 * 返回一个节点的 css selector
 * @param {Element} node
 * @param {boolean} optimized
 * @param {boolean} isTargetNode
 * @param {boolean} compatible 兼容原来的方式
 * @return {DOMNodePathStep}
 */
function step (node, optimized, isTargetNode, compatible) {
  if (node.nodeType !== NodeConstructor.ELEMENT_NODE) {
    return null
  }

  var id = node.getAttribute('id')
  // 最优解析
  // 如果该元素有id，直接返回id

  if (optimized && id && !compatible) {
    return new DOMNodePathStep(base.idSelector(id), true)
  }

  // 如果元素全局唯一，直接返回元素nodeName
  var nodeNameLower = node.nodeName.toLowerCase()
  if (nodeNameLower === 'body' || nodeNameLower === 'head' || nodeNameLower === 'html') {
    return new DOMNodePathStep(node.nodeName.toLowerCase(), true)
  }

  // 生成选择器
  return selector(node, optimized, isTargetNode)
}

/**
 * 生成节点 selector
 * @param {Element} node
 * @param {boolean} optimized - 是否生成最优selector
 * @param {boolean} compatible
 * @return {string}
 */
function path (node, optimized, compatible) {
  if (node.nodeType !== NodeConstructor.ELEMENT_NODE) {
    return ''
  }

  var steps = []
  var contextNode = node

  while (contextNode) {
    var token = step(contextNode, optimized, contextNode === node, compatible)
    if (!token) break
    steps.push(token)
    if (token.optimized) break
    contextNode = contextNode.parentNode
  }

  return steps.reverse().join(' > ')
}

/**
 * 生成节点最优 selector
 * @param node
 * @return {string}
 */
function optimized (node) {
  return path(node, true, true)
}

/**
 * 生成节点完整 selector
 * @param {Element} node
 * @return {string}
 */
function entire (node) {
  return path(node, false, false)
}

module.exports.optimized = optimized
module.exports.entire = entire
