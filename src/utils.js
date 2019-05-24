/**
 * @Author sugo.io<asd>
 * @Date 17-11-14
 */
const utils = require('sugo-sdk-js-utils')
const CONSTANTS = require('../constants')

const _ = utils['default']

/**
 * @description获取网格热图相关参数
 * @returns { xTotal, yTotal, gridWidth, gridHeight }
 */
const getGridConfig = () => {
  let isMobile = _.info.isMobile()
  // console.log(isMobile,' =====isMobile')
  // if(!isMobile && document.body.scrollWidth < document.body.scrollHeight) { // web窗口缩放
  //   isMobile = true
  // }
  let isHeatmapView // 热图分析模式
  const payload = window[CONSTANTS.RESOLUTION_MODE] || {}
  if (payload.resolution === 'mobile') { // 手机分辨率热图分析模式
    isHeatmapView = true
    isMobile = true
  }
  // web: width: 100%; height: 100%;
  // pad: width: 768px; height: 1024px;
  // mobile: width: 375px; height: 627px;
  const xTotal = !isMobile ? 128 : 36
  const yTotal = !isMobile ? 72 : 64
  const width = isHeatmapView ? 375 : (!isMobile ? document.body.scrollWidth : screen.width) // pc考虑页面可以自定义缩放取实际body宽度计算
  const height = isHeatmapView ? 627 : screen.height
  const gridWidth = (width / xTotal).toFixed(2)
  const gridHeight = (height / yTotal).toFixed(2)
  // console.log(xTotal, yTotal, gridWidth, gridHeight, 'getGridConfig====', screen.height, document.body.scrollWidth)
  return {
    xTotal,
    yTotal,
    gridWidth,
    gridHeight
  }
}

/**
 * 获取当前页面路径(含协议、域名)
 * @param {*} enable_hash
 */
const getCurrentUrl = enable_hash => {
  const hash = enable_hash === true ? location.hash : ''
  // 宇信专有判断
  const singlePage = window[CONSTANTS.SINGLE_PAGE_CODE]
  const single_page_code =  singlePage && singlePage.code ? ('#' + singlePage.code) : ''
  return (location.origin || (location.protocol + '//' + location.host)) + location.pathname + single_page_code + hash
}

/**
 * 获取当前页面路径(不含协议、域名)
 * @param {*} enable_hash
 */
const getCurrentPathname = enable_hash => {
  const hash = enable_hash === true ? location.hash : ''
  // 宇信专有判断
  const singlePage = window[CONSTANTS.SINGLE_PAGE_CODE]
  const single_page_code = singlePage && singlePage.code ? ('#' + singlePage.code) : ''
  return location.pathname + single_page_code + hash
}

/**
 * @param {number} startX 起始点x
 * @param {number} startY 起始点y
 * @param {number} _x 结束点x
 * @param {number} _y 结束点y
 */
const getPointByPosition = ({ startX, startY, _x, _y }) => {
  // console.log(startX, startY, _x, _y, 'ffffffffffffp')
  const { xTotal, gridWidth, gridHeight } = getGridConfig()
  const point = []
  const beginY = Math.floor(startY / gridHeight)
  const top = beginY * gridHeight
  const countY = Math.ceil((_y - top) / gridHeight)
  const beginX = Math.floor(startX / gridWidth)
  const left = beginX * gridWidth
  const countX = Math.ceil((_x - left) / gridWidth)
  for (let i = 0; i < countY; i++) {
    for (let j = 0; j < countX; j++) {
      point.push((xTotal * (i + beginY)) + beginX + j + 1)
    }
  }
  return {
    point,
    position: {
      left,
      top,
      height: countY * gridHeight,
      width: countX * gridWidth
    }
  }
}

/**
 * 根据鼠标位置获取当前所在第几格数
 * @param {*} x e.clientX
 * @param {*} y e.clientY
 */
const getEventPointNumber = (x, y) => {
  const { xTotal, gridWidth, gridHeight } = getGridConfig()
  const pointX = Math.floor(x / gridWidth) + 1
  const pointY = Math.floor(y / gridHeight)
  return (pointY * xTotal + pointX) + ''
}

/** 弹出框提示 */
const Message = {
  confirm(Modal, { title = '消息提示', content, onOk}) {
    Modal.confirm({
      title,
      content,
      zIndex: 2147483649,
      className: 'sugo-sdk-editor-ignore',
      onOk
    })
  },
  notice(Modal, type, msg) {
    Modal[type]({
      title: '消息提示',
      content: msg,
      zIndex: 2147483649,
      className: 'sugo-sdk-editor-ignore'
    })
  },
  success(modal, msg) {
    this.notice(modal, 'success', msg)
  },
  error(modal, msg) {
    this.notice(modal, 'error', msg)
  },
  info(modal, msg) {
    this.notice(modal, 'info', msg)
  },
  warning(modal, msg) {
    this.notice(modal, 'warning', msg)
  }
}

/** 父窗口发送消息 */
const sendMessage2Parent = (data, origin = '*') => {
  parent.postMessage(data, origin)
}

module.exports = {
  _,
  getCurrentUrl,
  getCurrentPathname,
  userAgent: window.navigator.userAgent,
  getEventPointNumber,
  sendMessage2Parent,
  Message,
  getPointByPosition,
  getGridConfig
}
