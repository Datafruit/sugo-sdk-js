/**
 * @Author sugo.io<asd>
 * @Date 17-11-17
 */

var _ = require('sugo-sdk-js-utils')['default']
var Config = require('../config')
var CONSTANTS = require('../../constants')
var Logger = require('../logger').get('Persistence')

var RESERVED_PROPERTIES = [
  CONSTANTS.SET_QUEUE_KEY,
  CONSTANTS.SET_ONCE_QUEUE_KEY,
  CONSTANTS.ADD_QUEUE_KEY,
  CONSTANTS.APPEND_QUEUE_KEY,
  CONSTANTS.UNION_QUEUE_KEY,
  CONSTANTS.PEOPLE_DISTINCT_ID_KEY,
  CONSTANTS.ALIAS_ID_KEY,
  CONSTANTS.CAMPAIGN_IDS_KEY,
  CONSTANTS.EVENT_TIMERS_KEY
]

/**
 * 初始化时确定storage
 * Sugoio Persistence Object
 * @param {SugoIOConfigInterface} config
 */
function Persistence (config) {
  this.props = {}
  this.name = null
  this.storage = null
  this.disabled = false
  this.campaign_params_saved = false
  this.default_expiry = null
  this.expire_days = null
  this.cross_subdomain = false
  this.secure = false

  if (config.persistence_name) {
    this.name = 'sg_' + config.persistence_name
  } else {
    this.name = 'sg_' + config.token + '_sugoio'
  }

  var storage_type = config.persistence
  if (storage_type !== 'cookie' && storage_type !== 'localStorage') {
    Logger.error('Unknown persistence type ' + storage_type + '; falling back to cookie')
    storage_type = config.persistence = 'cookie'
  }

  function localStorage_supported () {
    var supported = true
    try {
      var key = '__sglssupport__', val = 'xyz'
      _.localStorage.set(key, val)
      if (_.localStorage.get(key) !== val) {
        supported = false
      }
      _.localStorage.remove(key)
    } catch (err) {
      supported = false
    }
    if (!supported) {
      Logger.warn('localStorage unsupported; falling back to cookie store')
    }
    return supported
  }

  if (storage_type === 'localStorage' && localStorage_supported()) {
    this.storage = _.localStorage
  } else {
    this.storage = _.cookie
  }

  this.load()
  this.update_config(config)
  this.upgrade(config)
  this.save()
}

/**
 * 返回props上的所有字段,排除 RESERVED_PROPERTIES 中的 key
 * @return {object}
 */
Persistence.prototype.properties = function () {
  var p = {}
  // Filter out reserved properties
  _.each(this.props, function (v, k) {
    if (_.include(RESERVED_PROPERTIES, k) || k.indexOf(CONSTANTS.PEOPLE_REAL_USER_ID_DIMENSION_PREFIX) === 0) {
      return
    }
    p[k] = v
  })
  return p
}

/**
 * 读取已存的数据
 * @return {object}
 */
Persistence.prototype.load = function () {
  if (this.disabled) { return this.props }

  var entry = this.storage.parse(this.name)

  if (entry) {
    this.props = _.extend({}, entry)
  }

  return this.props
}

/**
 * 更新属性
 * @param {SugoIOConfigInterface} config
 * @return {Persistence}
 */
Persistence.prototype.upgrade = function (config) {
  var upgrade_from_old_lib = config.upgrade, old_cookie_name, old_cookie

  if (upgrade_from_old_lib) {
    old_cookie_name = 'sg_super_properties'
    // Case where they had a custom cookie name before.
    if (typeof(upgrade_from_old_lib) === 'string') {
      old_cookie_name = upgrade_from_old_lib
    }

    old_cookie = this.storage.parse(old_cookie_name)

    // remove the cookie
    this.storage.remove(old_cookie_name)
    this.storage.remove(old_cookie_name, true)

    if (old_cookie) {
      this.props = _.extend(
        this.props,
        old_cookie.all,
        old_cookie.events
      )
    }
  }

  if (!config.cookie_name && config.name !== CONSTANTS.PRIMARY_INSTANCE_NAME) {
    // special case to handle people with cookies of the form
    // mp_TOKEN_INSTANCENAME from the first release of this library
    old_cookie_name = 'sg_' + config.token + '_' + config.name
    old_cookie = this.storage.parse(old_cookie_name)

    if (old_cookie) {
      this.storage.remove(old_cookie_name)
      this.storage.remove(old_cookie_name, true)

      // Save the prop values that were in the cookie from before -
      // this should only happen once as we delete the old one.
      this.register_once(old_cookie)
    }
  }

  if (this.storage === _.localStorage) {
    old_cookie = _.cookie.parse(this.name)

    _.cookie.remove(this.name)
    _.cookie.remove(this.name, true)

    if (old_cookie) {
      this.register_once(old_cookie)
    }
  }

  return this
}

/**
 * 将属性写入到持久化存储中
 * @return {Persistence}
 */
Persistence.prototype.save = function () {
  if (this.disabled) { return this}
  this._expire_notification_campaigns()
  this.storage.set(
    this.name,
    _.JSONEncode(this.props),
    this.expire_days,
    this.cross_subdomain,
    this.secure
  )
  return this
}

/**
 * 删除存储中的记录
 * @return {Persistence}
 */
Persistence.prototype.remove = function () {
  // remove both domain and subdomain cookies
  this.storage.remove(this.name, false)
  this.storage.remove(this.name, true)
  return this
}

// removes the storage entry and deletes all loaded data
// forced name for tests
/**
 * 删除存储中的记录,并清除props对象上的记录
 * @return {Persistence}
 */
Persistence.prototype.clear = function () {
  this.remove()
  this.props = {}
  return this
}

/**
 * @param {Object} props
 * @param {*=} default_value
 * @param {number=} days
 */
Persistence.prototype.register_once = function (props, default_value, days) {
  if (_.isObject(props)) {
    if (typeof(default_value) === 'undefined') {
      default_value = 'None'
    }

    this.expire_days = (typeof(days) === 'undefined') ? this.default_expiry : days

    _.each(props, function (val, prop) {
      if (!this.props[prop] || this.props[prop] === default_value) {
        this.props[prop] = val
      }
    }, this)

    this.save()

    return true
  }
  return false
}

/**
 * @param {Object} props
 * @param {number} [days]
 * @return {boolean}
 */
Persistence.prototype.register = function (props, days) {
  if (_.isObject(props)) {
    this.expire_days = (typeof(days) === 'undefined') ? this.default_expiry : days

    _.extend(this.props, props)

    this.save()

    return true
  }
  return false
}

/**
 * 清除单个记录
 * @param prop
 * @return {Persistence}
 */
Persistence.prototype.unregister = function (prop) {
  if (prop in this.props) {
    delete this.props[prop]
    this.save()
  }
  return this
}

/**
 * 检测属性是否过期,如果过期,删除记录
 * @return {Persistence}
 * @private
 */
Persistence.prototype._expire_notification_campaigns = function () {
  var campaigns_shown = this.props[CONSTANTS.CAMPAIGN_IDS_KEY]
  // 1 minute (Config.DEBUG) / 1 hour (PDXN)
  var EXPIRY_TIME = Config.debug ? 60 * 1000 : 60 * 60 * 1000

  if (!campaigns_shown) {
    return this
  }

  for (var campaign_id in campaigns_shown) {
    if (!campaigns_shown.hasOwnProperty(campaign_id)) continue
    if (1 * new Date() - campaigns_shown[campaign_id] > EXPIRY_TIME) {
      delete campaigns_shown[campaign_id]
    }
  }

  if (_.isEmptyObject(campaigns_shown)) {
    delete this.props[CONSTANTS.CAMPAIGN_IDS_KEY]
  }
  return this
}

/**
 * 写入有过期状态的属性
 * TODO 该属性值由_.info.campaignParams函数提供,真是太TM扯淡了,业务和库高度耦合
 * @return {Persistence}
 */
Persistence.prototype.update_campaign_params = function () {
  if (!this.campaign_params_saved) {
    this.register_once(_.info.campaignParams())
    this.campaign_params_saved = true
  }
  return this
}

/**
 * 解析页面referrer是否为搜索引擎,写入持久存储
 * @param referrer
 * @return {Persistence}
 */
Persistence.prototype.update_search_keyword = function (referrer) {
  this.register(_.info.searchInfo(referrer))
  return this
}

// EXPORTED METHOD, we test this directly.
Persistence.prototype.update_referrer_info = function (referrer) {
  // If referrer doesn't exist, we want to note the fact that it was type-in traffic.
  this.register_once({ 'referring_domain': _.info.referringDomain(referrer) || 'direct' }, '')
}

/**
 * 解析referrer domain
 * @return {object}
 */
Persistence.prototype.get_referrer_info = function () {
  return _.strip_empty_properties({ 'referring_domain': this.props.referring_domain })
}

// safely fills the passed in object with stored properties,
// does not override any properties defined in both
// returns the passed in object
/**
 * 合并this.props与props并返回结果
 * 只有props上没有的属性,才会从this.props取
 * @param {object} props
 * @return {object}
 */
Persistence.prototype.safe_merge = function (props) {
  _.each(this.props, function (val, prop) {
    if (!(prop in props)) {
      props[prop] = val
    }
  })

  return props
}

/**
 * 设置属性
 * @param config
 * @return {Persistence}
 */
Persistence.prototype.update_config = function (config) {
  this.default_expiry = this.expire_days = config.cookie_expiration
  this.set_disabled(config.disable_persistence)
  this.set_cross_subdomain(config.cross_subdomain_cookie)
  this.set_secure(config.secure_cookie)
  return this
}

/**
 * 更新disabled属性,如果disable为true,删除记录
 * @param {boolean} disabled
 * @return {Persistence}
 */
Persistence.prototype.set_disabled = function (disabled) {
  this.disabled = disabled
  if (this.disabled) {
    this.remove()
  }
  return this
}

/**
 * 更新cross_subdomain,如果cross_subdomain与当前保存的不一致,则更新记录
 * @param cross_subdomain
 * @return {Persistence}
 */
Persistence.prototype.set_cross_subdomain = function (cross_subdomain) {
  if (cross_subdomain !== this.cross_subdomain) {
    this.cross_subdomain = cross_subdomain
    this.remove()
    this.save()
  }
  return this
}

/**
 * 返回cross_subdomain
 * @return {boolean}
 */
Persistence.prototype.get_cross_subdomain = function () {
  return this.cross_subdomain
}

/**
 * 更新secure,如果与之前的记录不同,更新记录
 * @param {boolean} secure
 * @return {Persistence}
 */
Persistence.prototype.set_secure = function (secure) {
  if (secure !== this.secure) {
    this.secure = !!secure
    this.remove()
    this.save()
  }
}

/**
 * TODO 一堆people相关的操作,目前好像没用上,待查
 * @param queue
 * @param data
 * @private
 */
Persistence.prototype._add_to_people_queue = function (queue, data) {
  var
    q_key = this._get_queue_key(queue),
    q_data = data[queue],
    set_q = this._get_or_create_queue(CONSTANTS.SET_ACTION),
    set_once_q = this._get_or_create_queue(CONSTANTS.SET_ONCE_ACTION),
    add_q = this._get_or_create_queue(CONSTANTS.ADD_ACTION),
    union_q = this._get_or_create_queue(CONSTANTS.UNION_ACTION),
    append_q = this._get_or_create_queue(CONSTANTS.APPEND_ACTION, [])

  if (q_key === CONSTANTS.SET_QUEUE_KEY) {
    // Update the set queue - we can override any existing values
    _.extend(set_q, q_data)
    // if there was a pending increment, override it
    // with the set.
    this._pop_from_people_queue(CONSTANTS.ADD_ACTION, q_data)
    // if there was a pending union, override it
    // with the set.
    this._pop_from_people_queue(CONSTANTS.UNION_ACTION, q_data)
  } else if (q_key === CONSTANTS.SET_ONCE_QUEUE_KEY) {
    // only queue the data if there is not already a set_once call for it.
    _.each(q_data, function (v, k) {
      if (!(k in set_once_q)) {
        set_once_q[k] = v
      }
    })
  } else if (q_key === CONSTANTS.ADD_QUEUE_KEY) {
    _.each(q_data, function (v, k) {
      // If it exists in the set queue, increment
      // the value
      if (k in set_q) {
        set_q[k] += v
      } else {
        // If it doesn't exist, update the add
        // queue
        if (!(k in add_q)) {
          add_q[k] = 0
        }
        add_q[k] += v
      }
    }, this)
  } else if (q_key === CONSTANTS.UNION_QUEUE_KEY) {
    _.each(q_data, function (v, k) {
      if (_.isArray(v)) {
        if (!(k in union_q)) {
          union_q[k] = []
        }
        // We may send duplicates, the server will dedup them.
        union_q[k] = union_q[k].concat(v)
      }
    })
  } else if (q_key === CONSTANTS.APPEND_QUEUE_KEY) {
    append_q.push(q_data)
  }

  Logger.log('SUGOIO PEOPLE REQUEST (QUEUED, PENDING IDENTIFY):')
  Logger.log(data)

  this.save()
}

Persistence.prototype._pop_from_people_queue = function (queue, data) {
  var q = this._get_queue(queue)
  if (!_.isUndefined(q)) {
    _.each(data, function (v, k) {
      delete q[k]
    }, this)

    this.save()
  }
}

Persistence.prototype._get_queue_key = function (queue) {
  if (queue === CONSTANTS.SET_ACTION) {
    return CONSTANTS.SET_QUEUE_KEY
  } else if (queue === CONSTANTS.SET_ONCE_ACTION) {
    return CONSTANTS.SET_ONCE_QUEUE_KEY
  } else if (queue === CONSTANTS.ADD_ACTION) {
    return CONSTANTS.ADD_QUEUE_KEY
  } else if (queue === CONSTANTS.APPEND_ACTION) {
    return CONSTANTS.APPEND_QUEUE_KEY
  } else if (queue === CONSTANTS.UNION_ACTION) {
    return CONSTANTS.UNION_QUEUE_KEY
  } else {
    Logger.error('Invalid queue:', queue)
  }
}

Persistence.prototype._get_queue = function (queue) {
  return this.props[this._get_queue_key(queue)]
}

Persistence.prototype._get_or_create_queue = function (queue, default_val) {
  var key = this._get_queue_key(queue)
  default_val = _.isUndefined(default_val) ? {} : default_val

  return this.props[key] || (this.props[key] = default_val)
}

Persistence.prototype.set_event_timer = function (event_name, timestamp) {
  var timers = this.props[CONSTANTS.EVENT_TIMERS_KEY] || {}
  timers[event_name] = timestamp
  this.props[CONSTANTS.EVENT_TIMERS_KEY] = timers
  this.save()
}

Persistence.prototype.remove_event_timer = function (event_name) {
  var timers = this.props[CONSTANTS.EVENT_TIMERS_KEY] || {}
  var timestamp = timers[event_name]
  if (!_.isUndefined(timestamp)) {
    delete this.props[CONSTANTS.EVENT_TIMERS_KEY][event_name]
    this.save()
  }
  return timestamp
}

module.exports = Persistence
