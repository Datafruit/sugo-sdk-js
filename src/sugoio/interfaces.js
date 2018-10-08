/**
 * @Author sugo.io<asd>
 * @Date 17-11-17
 */

/**
 * @typedef {object} SugoIOConfigInterface
 * @property {string}    [api_host]
 * @property {string}    [app_host]
 * @property {string}    [decide_host]
 * @property {boolean}   [autotrack]
 * @property {string}    [cdn]
 * @property {string}    [encode_type]             // enum { json, plain }
 * @property {object}    [dimensions]
 * @property {boolean}   [cross_subdomain_cookie]
 * @property {string}    [persistence]             // enum { cookie, localStorage }
 * @property {string}    [persistence_name]        // 持久化数据key
 * @property {string}    [cookie_name]
 * @property {function}  [loaded]
 * @property {boolean}   [store_google]
 * @property {boolean}   [save_referrer]
 * @property {boolean}   [test]
 * @property {boolean}   [verbose]
 * @property {boolean}   [img]
 * @property {boolean}   [track_pageview]
 * @property {boolean}   [debug]
 * @property {number}    [track_links_timeout]
 * @property {number}    [cookie_expiration]
 * @property {boolean}   [upgrade]
 * @property {boolean}   [disable_persistence]
 * @property {boolean}   [disable_cookie]
 * @property {boolean}   [secure_cookie]
 * @property {boolean}   [ip]
 * @property {string[]}  [property_blacklist]
 *
 * @property {string}    [token]
 * @property {string}    [project_id]
 * @property {string}    [name]
 */


/**
 * @typedef {object} SugoIOInstanceParams
 * @property {string}                token
 * @property {string}                name
 * @property {SugoIOConfigInterface} config
 */

/**
 * @typedef {Array} SugoIORawMasterPeople
 * @property {function} toString
 */

/**
 * People shallow methods
 * @typedef {object} SugoIOPeopleShallow
 * @property {function} set
 * @property {function} set_once
 * @property {function} increment
 * @property {function} append
 * @property {function} union
 * @property {function} track_charge
 * @property {function} clear_charges
 * @property {function} delete_user
 */

/**
 * 未初始化的SugoIO主对象
 * @typedef {Array} SugoIORawMaster
 * @property {Array<SugoIOInstanceParams>}      _i
 * @property {number}                           _SV
 * @property {SugoIORawMasterPeople}            people
 * @property {function(no_stub:boolean)}        toString
 *
 *
 * shallow methods for Sugoio & People
 * @property {function}            time_event
 * @property {function}            track
 * @property {function}            track_pageview
 * @property {function}            track_links
 * @property {function}            track_forms
 * @property {function}            register
 * @property {function}            register_once
 * @property {function}            unregister
 * @property {function}            name_tag
 * @property {function}            set_config
 * @property {function}            reset
 * @property {SugoIOPeopleShallow} people
 */
