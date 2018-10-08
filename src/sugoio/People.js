/**
 * @Author sugo.io<asd>
 * @Date 17-11-18
 */

var _ = require('sugo-sdk-js-utils')['default']
var CONSTANTS = require('../../constants')
var Logger = require('../logger').get('People')

function People () {
  this._sugoio = null
}

People.prototype._init = function (sugoio_instance) {
  this._sugoio = sugoio_instance
}

/**
 * Set properties on a user record.
 *
 * ### Usage:
 *
 *     sugoio.people.set('gender', 'm');
 *
 *     // or set multiple properties at once
 *     sugoio.people.set({
 *         'Company': 'Acme',
 *         'Plan': 'Premium',
 *         'Upgrade date': new Date()
 *     });
 *     // properties can be strings, integers, dates, or lists
 *
 * @param {Object|String} prop If a string, this is the name of the property. If an object, this is an associative array of names and values.
 * @param {*} [to] A value to set on the given property name
 * @param {Function} [callback] If provided, the callback will be called after the tracking event
 */
People.prototype.set = function (prop, to, callback) {
  var data = {}
  var $set = {}
  if (_.isObject(prop)) {
    _.each(prop, function (v, k) {
      if (!this._is_reserved_property(k)) {
        $set[k] = v
      }
    }, this)
    callback = to
  } else {
    $set[prop] = to
  }

  // make sure that the referrer info has been updated and saved
  if (this._get_config('save_referrer')) {
    this._sugoio.persistence.update_referrer_info(document.referrer)
  }

  // update $set object with default people properties
  $set = _.extend(
    {},
    _.info.people_properties(),
    this._sugoio.persistence.get_referrer_info(),
    $set
  )

  data[CONSTANTS.SET_ACTION] = $set

  return this._send_request(data, callback)
}

/**
 * Set properties on a user record, only if they do not yet exist.
 * This will not overwrite previous people property values, unlike
 * people.set().
 *
 * ### Usage:
 *
 *     sugoio.people.set_once('First Login Date', new Date());
 *
 *     // or set multiple properties at once
 *     sugoio.people.set_once({
 *         'First Login Date': new Date(),
 *         'Starting Plan': 'Premium'
 *     });
 *
 *     // properties can be strings, integers or dates
 *
 * @param {Object|String} prop If a string, this is the name of the property. If an object, this is an associative array of names and values.
 * @param {*} [to] A value to set on the given property name
 * @param {Function} [callback] If provided, the callback will be called after the tracking event
 */
People.prototype.set_once = function (prop, to, callback) {
  var data = {}
  var $set_once = {}
  if (_.isObject(prop)) {
    _.each(prop, function (v, k) {
      if (!this._is_reserved_property(k)) {
        $set_once[k] = v
      }
    }, this)
    callback = to
  } else {
    $set_once[prop] = to
  }
  data[CONSTANTS.SET_ONCE_ACTION] = $set_once
  return this._send_request(data, callback)
}

/**
 * Increment/decrement numeric people analytics properties.
 *
 * ### Usage:
 *
 *     sugoio.people.increment('page_views', 1);
 *
 *     // or, for convenience, if you're just incrementing a counter by
 *     // 1, you can simply do
 *     sugoio.people.increment('page_views');
 *
 *     // to decrement a counter, pass a negative number
 *     sugoio.people.increment('credits_left', -1);
 *
 *     // like sugoio.people.set(), you can increment multiple
 *     // properties at once:
 *     sugoio.people.increment({
 *         counter1: 1,
 *         counter2: 6
 *     });
 *
 * @param {object|string} prop If a string, this is the name of the property. If an object, this is an associative array of names and numeric values.
 * @param {number|function} [by] An amount to increment the given property
 * @param {function} [callback] If provided, the callback will be called after the tracking event
 */
People.prototype.increment = function (prop, by, callback) {
  var data = {}
  var $add = {}
  if (_.isObject(prop)) {
    _.each(prop, function (v, k) {
      if (!this._is_reserved_property(k)) {
        if (isNaN(parseFloat(v))) {
          return Logger.error('Invalid increment value passed to sugoio.people.increment - must be a number')
        } else {
          $add[k] = v
        }
      }
    }, this)
    callback = by
  } else {
    // convenience: sugoio.people.increment('property'); will
    // increment 'property' by 1
    if (_.isUndefined(by)) {
      by = 1
    }
    $add[prop] = by
  }
  data[CONSTANTS.ADD_ACTION] = $add

  return this._send_request(data, callback)
}

/**
 * Append a value to a list-valued people analytics property.
 *
 * ### Usage:
 *
 *     // append a value to a list, creating it if needed
 *     sugoio.people.append('pages_visited', 'homepage');
 *
 *     // like sugoio.people.set(), you can append multiple
 *     // properties at once:
 *     sugoio.people.append({
 *         list1: 'bob',
 *         list2: 123
 *     });
 *
 * @param {Object|String} list_name If a string, this is the name of the property. If an object, this is an associative array of names and values.
 * @param {*} [value] An item to append to the list
 * @param {Function} [callback] If provided, the callback will be called after the tracking event
 */
People.prototype.append = function (list_name, value, callback) {
  var data = {}
  var $append = {}
  if (_.isObject(list_name)) {
    _.each(list_name, function (v, k) {
      if (!this._is_reserved_property(k)) {
        $append[k] = v
      }
    }, this)
    callback = value
  } else {
    $append[list_name] = value
  }
  data[CONSTANTS.APPEND_ACTION] = $append

  return this._send_request(data, callback)
}

/**
 * Merge a given list with a list-valued people analytics property,
 * excluding duplicate values.
 *
 * ### Usage:
 *
 *     // merge a value to a list, creating it if needed
 *     sugoio.people.union('pages_visited', 'homepage');
 *
 *     // like sugoio.people.set(), you can append multiple
 *     // properties at once:
 *     sugoio.people.union({
 *         list1: 'bob',
 *         list2: 123
 *     });
 *
 *     // like sugoio.people.append(), you can append multiple
 *     // values to the same list:
 *     sugoio.people.union({
 *         list1: ['bob', 'billy']
 *     });
 *
 * @param {object|string} list_name If a string, this is the name of the property. If an object, this is an associative array of names and values.
 * @param {*} [values] Value / values to merge with the given property
 * @param {Function} [callback] If provided, the callback will be called after the tracking event
 */
People.prototype.union = function (list_name, values, callback) {
  var data = {}
  var $union = {}
  if (_.isObject(list_name)) {
    _.each(list_name, function (v, k) {
      if (!this._is_reserved_property(k)) {
        $union[k] = _.isArray(v) ? v : [v]
      }
    }, this)
    callback = values
  } else {
    $union[list_name] = _.isArray(values) ? values : [values]
  }
  data[CONSTANTS.UNION_ACTION] = $union

  return this._send_request(data, callback)
}

/**
 * Record that you have charged the current user a certain amount
 * of money. Charges recorded with track_charge() will appear in the
 * Sugoio revenue report.
 *
 * ### Usage:
 *
 *     // charge a user $50
 *     sugoio.people.track_charge(50);
 *
 *     // charge a user $30.50 on the 2nd of january
 *     sugoio.people.track_charge(30.50, {
 *         'time': new Date('jan 1 2012')
 *     });
 *
 * @param {Number} amount The amount of money charged to the current user
 * @param {Object} [properties] An associative array of properties associated with the charge
 * @param {Function} [callback] If provided, the callback will be called when the server responds
 */
People.prototype.track_charge = function (amount, properties, callback) {
  if (!_.isNumber(amount)) {
    amount = parseFloat(amount)
    if (isNaN(amount)) {
      Logger.error('Invalid value passed to sugoio.people.track_charge - must be a number')
      return
    }
  }

  return this.append('transactions', _.extend({ 'amount': amount }, properties), callback)
}

/**
 * Permanently clear all revenue report transactions from the
 * current user's people analytics profile.
 *
 * ### Usage:
 *
 *     sugoio.people.clear_charges();
 *
 * @param {Function} [callback] If provided, the callback will be called after the tracking event
 */
People.prototype.clear_charges = function (callback) {
  return this.set('transactions', [], callback)
}

/**
 * Permanently deletes the current people analytics profile from
 * Sugoio (using the current client_distinct_id).
 *
 * ### Usage:
 *
 *     // remove the all data you have stored about the current user
 *     sugoio.people.delete_user();
 *
 */
People.prototype.delete_user = function () {
  if (!this._identify_called()) {
    Logger.error('sugoio.people.delete_user() requires you to call identify() first')
    return
  }
  var data = {}
  data['delete'] = this._sugoio.get_distinct_id()
  return this._send_request(data)
}

/**
 * toString
 * @return {string}
 */
People.prototype.toString = function () {
  return this._sugoio.toString() + '.people'
}

/**
 * @param {object} data
 * @param {function} callback
 * @return {object}
 * @private
 */
People.prototype._send_request = function (data, callback) {
  data.token = this._get_config('token')
  data.distinct_id = this._sugoio.get_distinct_id()

  var date_encoded_data = _.encodeDates(data)
  var truncated_data = _.truncate(date_encoded_data, 255)
  var json_data = _.JSONEncode(date_encoded_data)
  var encoded_data = _.base64Encode(json_data)

  if (!this._identify_called()) {
    this._enqueue(data)
    if (!_.isUndefined(callback)) {
      if (this._get_config('verbose')) {
        callback({ status: -1, error: null })
      } else {
        callback(-1)
      }
    }
    return truncated_data
  }

  Logger.log('SUGOIO PEOPLE REQUEST:')
  Logger.log(truncated_data)

  this._sugoio._send_request(
    this._get_config('api_host') + '/post',
    {
      'data': true,
      'locate': this.get_config('project_id'),
      'token': this.get_config('token')
    },
    this._sugoio._prepare_callback(callback, truncated_data),
    encoded_data
  )

  return truncated_data
}

/**
 * @param conf_var
 * @return {*}
 * @private
 */
People.prototype._get_config = function (conf_var) {
  return this._sugoio.get_config(conf_var)
}

/**
 * @return {boolean}
 * @private
 */
People.prototype._identify_called = function () {
  return this._sugoio._flags.identify_called === true
}

/**
 * Queue up engage operations if identify hasn't been called yet.
 * @param {object} data
 * @private
 */
People.prototype._enqueue = function (data) {
  if (CONSTANTS.SET_ACTION in data) {
    this._sugoio.persistence._add_to_people_queue(CONSTANTS.SET_ACTION, data)
  } else if (CONSTANTS.SET_ONCE_ACTION in data) {
    this._sugoio.persistence._add_to_people_queue(CONSTANTS.SET_ONCE_ACTION, data)
  } else if (CONSTANTS.ADD_ACTION in data) {
    this._sugoio.persistence._add_to_people_queue(CONSTANTS.ADD_ACTION, data)
  } else if (CONSTANTS.APPEND_ACTION in data) {
    this._sugoio.persistence._add_to_people_queue(CONSTANTS.APPEND_ACTION, data)
  } else if (CONSTANTS.UNION_ACTION in data) {
    this._sugoio.persistence._add_to_people_queue(CONSTANTS.UNION_ACTION, data)
  } else {
    Logger.error('Invalid call to _enqueue():', data)
  }
}

/**
 * Flush queued engage operations - order does not matter,
 * and there are network level race conditions anyway
 * @param _set_callback
 * @param _add_callback
 * @param _append_callback
 * @param _set_once_callback
 * @param _union_callback
 * @private
 */
People.prototype._flush = function (_set_callback, _add_callback, _append_callback, _set_once_callback, _union_callback) {
  var _this = this
  var $set_queue = _.extend({}, this._sugoio.persistence._get_queue(CONSTANTS.SET_ACTION))
  var $set_once_queue = _.extend({}, this._sugoio.persistence._get_queue(CONSTANTS.SET_ONCE_ACTION))
  var $add_queue = _.extend({}, this._sugoio.persistence._get_queue(CONSTANTS.ADD_ACTION))
  var $append_queue = this._sugoio.persistence._get_queue(CONSTANTS.APPEND_ACTION)
  var $union_queue = _.extend({}, this._sugoio.persistence._get_queue(CONSTANTS.UNION_ACTION))

  if (!_.isUndefined($set_queue) && _.isObject($set_queue) && !_.isEmptyObject($set_queue)) {
    _this._sugoio.persistence._pop_from_people_queue(CONSTANTS.SET_ACTION, $set_queue)
    this.set($set_queue, function (response, data) {
      // on bad response, we want to add it back to the queue
      if (response === 0) {
        _this._sugoio.persistence._add_to_people_queue(CONSTANTS.SET_ACTION, $set_queue)
      }
      if (!_.isUndefined(_set_callback)) {
        _set_callback(response, data)
      }
    })
  }

  if (!_.isUndefined($set_once_queue) && _.isObject($set_once_queue) && !_.isEmptyObject($set_once_queue)) {
    _this._sugoio.persistence._pop_from_people_queue(CONSTANTS.SET_ONCE_ACTION, $set_once_queue)
    this.set_once($set_once_queue, function (response, data) {
      // on bad response, we want to add it back to the queue
      if (response === 0) {
        _this._sugoio.persistence._add_to_people_queue(CONSTANTS.SET_ONCE_ACTION, $set_once_queue)
      }
      if (!_.isUndefined(_set_once_callback)) {
        _set_once_callback(response, data)
      }
    })
  }

  if (!_.isUndefined($add_queue) && _.isObject($add_queue) && !_.isEmptyObject($add_queue)) {
    _this._sugoio.persistence._pop_from_people_queue(CONSTANTS.ADD_ACTION, $add_queue)
    this.increment($add_queue, function (response, data) {
      // on bad response, we want to add it back to the queue
      if (response === 0) {
        _this._sugoio.persistence._add_to_people_queue(CONSTANTS.ADD_ACTION, $add_queue)
      }
      if (!_.isUndefined(_add_callback)) {
        _add_callback(response, data)
      }
    })
  }

  if (!_.isUndefined($union_queue) && _.isObject($union_queue) && !_.isEmptyObject($union_queue)) {
    _this._sugoio.persistence._pop_from_people_queue(CONSTANTS.UNION_ACTION, $union_queue)
    this.union($union_queue, function (response, data) {
      // on bad response, we want to add it back to the queue
      if (response === 0) {
        _this._sugoio.persistence._add_to_people_queue(CONSTANTS.UNION_ACTION, $union_queue)
      }
      if (!_.isUndefined(_union_callback)) {
        _union_callback(response, data)
      }
    })
  }

  // we have to fire off each $append individually since there is
  // no concat method server side
  if (!_.isUndefined($append_queue) && _.isArray($append_queue) && $append_queue.length) {
    var $append_item
    var callback = function (response, data) {
      if (response === 0) {
        _this._sugoio.persistence._add_to_people_queue(CONSTANTS.APPEND_ACTION, $append_item)
      }
      if (!_.isUndefined(_append_callback)) {
        _append_callback(response, data)
      }
    }
    for (var i = $append_queue.length - 1; i >= 0; i--) {
      $append_item = $append_queue.pop()
      _this.append($append_item, callback)
    }
    // Save the shortened append queue
    _this._sugoio.persistence.save()
  }
}

/**
 * @param {*} prop
 * @return {boolean}
 * @private
 */
People.prototype._is_reserved_property = function (prop) {
  return prop === 'distinct_id' || prop === 'token'
}

module.exports = People
