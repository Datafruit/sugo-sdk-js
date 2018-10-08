/**
 * @Author sugo.io<asd>
 * @Date 17-11-18
 */

/** @type {SugoIOSDKJSConfig} */
var Config = require('../config')
var HTTP_PROTOCOL = (('https:' === document.location.protocol) ? 'https://' : 'http://')

/** @type {SugoIOConfigInterface} */
var DEFAULT_CONFIG = {
  api_host: HTTP_PROTOCOL + Config.api_host, //HTTP_PROTOCOL + 'api.mixpanel.com',
  app_host: HTTP_PROTOCOL + Config.app_host, //HTTP_PROTOCOL + 'mixpanel.com',
  decide_host: HTTP_PROTOCOL + Config.decide_host,
  autotrack: true,
  cdn: HTTP_PROTOCOL + Config.app_host,
  encode_type: Config.encode_type || 'plain', // json/plain
  dimensions: Config.dimensions || {},
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
  enable_hash: false // 单页应用页面设置开启hash配置
}

module.exports = DEFAULT_CONFIG
