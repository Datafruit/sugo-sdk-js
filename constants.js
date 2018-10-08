/**
 * @Author sugo.io<asd>
 * @Date 17-10-30
 * @desc 常量配置，如果没有把握，不要修改，可以新增
 */

module.exports = {
  // sugoio 实例挂载到window对象上的属性
  PRIMARY_INSTANCE_NAME: 'sugoio',
  // 全局匹配挂荎sugoio的属性
  INJECT_CONFIG_PROP_KEY: '__SUGO__INJECT__CONFIG__',

  /*  sugoio-core  */
  INIT_MODULE: 0,
  INIT_SNIPPET: 1,

  SET_QUEUE_KEY: '__sgs',
  SET_ONCE_QUEUE_KEY: '__sgso',
  ADD_QUEUE_KEY: '__sga',
  APPEND_QUEUE_KEY: '__sgap',
  UNION_QUEUE_KEY: '__sgu',
  SET_ACTION: 'set',
  SET_ONCE_ACTION: 'set_once',
  ADD_ACTION: 'add',
  APPEND_ACTION: 'append',
  UNION_ACTION: 'union',
  PEOPLE_DISTINCT_ID_KEY: 'people_distinct_id',
  ALIAS_ID_KEY: '__alias',
  CAMPAIGN_IDS_KEY: '__cmpns',
  EVENT_TIMERS_KEY: '__timers',

  /* 首次访问与首次登录 */
  // 用户真实id存储维度名前缀
  // 生成内部命名key,以免用户通过register方法覆盖
  PEOPLE_REAL_USER_ID_DIMENSION_PREFIX: '__rpx',
  FIRST_VISIT_TIME: 'first_visit_time',
  FIRST_LOGIN_TIME: 'first_login_time',

  /* standard event name */
  FIRST_VISIT_EVENT_NAME: '首次访问',
  FIRST_LOGIN_EVENT_NAME: '首次登录'
}
