/**
 * @Author sugo.io<asd>
 * @Date 17-11-18
 */

/** @type {SugoIOSDKJSConfig} */
var Config = require('../config')
var HTTP_PROTOCOL = (('https:' === document.location.protocol) ? 'https://' : 'http://')

/** @type {SugoIOConfigInterface} */
var DEFAULT_CONFIG = {
  api_host: HTTP_PROTOCOL + Config.api_host, // 网关数据上报地址 HTTP_PROTOCOL + 'api.sugoio.com',
  app_host: HTTP_PROTOCOL + Config.app_host, // 可视化配置服务端地址 HTTP_PROTOCOL + 'sugoio.com',
  decide_host: HTTP_PROTOCOL + (Config.decide_host || Config.app_host), // 加载已部署埋点配置地址
  cdn: HTTP_PROTOCOL + (Config.js_cdn || Config.app_host),
  autotrack: true,
  encode_type: Config.encode_type || 'plain', // json/plain
  /**
   * @deprecated
   */
  // dimensions: Config.dimensions || {},
  cross_subdomain_cookie: true,
  persistence: 'cookie',
  persistence_name: '__persistence__sugoio',
  cookie_name: '__cookie__',
  loaded: function () {},
  store_google: true,
  save_referrer: true,
  test: false,
  verbose: false,
  img: false,
  track_pageview: false,
  debug: false,
  track_links_timeout: 300,
  cookie_expiration: 365,
  upgrade: false,
  disable_persistence: false,
  disable_cookie: false,
  secure_cookie: false,
  ip: true,
  property_blacklist: [],
  enable_hash: false, // 单页应用页面设置开启hash配置
  enable_geo_track: false, // 位置信息上报设置
  editor: 'editor', // 默认加载包含vue版本js
  duration_track: true, //是否自动上报停留事件
  heatmap: false, // 是否支持事件热图功能
  heatmap_grid_track: false, // 是否支持网格热图事件上报功能
  heatmap_grid_track_throttle_batch_size: 50 // 网格热图事件上报累计满一定的次数才上报
}

module.exports = DEFAULT_CONFIG
