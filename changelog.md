# v1.5.0

- 每次打开页面设置根据当前url重新匹配页面
- 增加 editor-lite.js打包（不含vuejs），根据环境动态加载editor
- 将原来同类对象的深度监听改为浅监听，点击同类勾选重新计算同类path(解决某些环境同类堆栈溢出bug)
- 支持根据enable_hash监听hashchange事件，可视化埋点重新渲染埋点事件
- 支持根据enable_hash监听hashchange事件，sdk上报动态加载新配置并绑定事件

# v1.4.1

- add encodeURIComponent for decide
- add `event_type`, `path_name`, `page_category`, default value for track

# v1.4.0

- sugoio.init支持enable_hash参数, 主要针对vue等单页应用页面路径规则添加hash(pathname=location.pathname + location.hash)规则

```js
  sugoio.init('ee7469aca94d082748418945eccd13eb', {
    project_id: 'com_HyoaKhQMl_project_ry_2vnt1M',
    enable_hash: true,
    ...
  });
```
# v1.3.26

- 添加sugoio.updateSessionId()方法，更新cookie中的session_id值
- 小程序增加接口
  - sugoio.time_event 停留记时函数
  - sugoio.register 超级属性设置(存在覆盖)
  - sugoio.register_once 超级属性设置(存在则不添加)
  - sugoio.unregister 删除超级属性

# v1.3.25(2018-06-19)

 - 支持简单的关联元素同类埋点取值

# v1.3.23，24(2018-06-19)

- 完善小程序配置
- 压缩打包微信小程序

# v1.3.22(2018-06-19)

- 增加微信小程序代码埋点sdk(libs/sugo-wx-mini.program.min.js)

# v1.3.21(2018-06-19)

- 修复埋点与iscroll兼容问题

# v1.3.20(2018-06-11)

- 修复cdn初始化参数未覆盖问题
- 修复使用配置app_host拉取页面配置

# v1.3.18(2018-06-07)

- 修复sdk ie8下userAgent报错的问题

# v1.3.17(2018-04-27)

- 修复sdk的install函数, 确保每次都正确写入app_host等自定义配置

# v1.3.16(2017-11-21)
+ 增加`首次访问`,`首次登录`事件类型
+ 上报数据增加`first_visit_time`, `first_login_time`字段,
  分别对应`首次访问时间`,`首次登录时间`
+ 增加`sugoio.track_first_time`, `sugoio.clear_first_login`接口

### 接口定义
```typescript
interface SugoIO {
  // 上报用户首次登录状态,调用该接口,执行步骤如下:
  // 1. 如果user_id与持久化存储空间中的user_id一致,直接调用callback, 返回 SugoIO
  // 2. 查询该用户是否为首次登录
  //   2.1 请求成功
  //     2.1.1 首次登录
  //     2.1.2 将user_id,首次登录时间与user_real_dimension(如果提供了)写入存储空间
  //     2.1.3 发送首次登录事件
  //     2.2.4 执行callback(null)
  //   2.2 请求错误
  //     2.2.1 执行callback(err)
  // 3. 返回SugoIO
  track_first_time(
    // 用户真实id
    user_id: string,                                     
    // 用户真实id所属维度名,如果没有提供,上报数据中不会包含user_id
    user_real_dimension?: string | ((err: Error |null) => any),         
    // 回调函数,如果出错,err为Error类型,正常完成时err为null
    callback?: (err: Error | null)=> any    
  ): SugoIO

  // 清除用户登录状态,返回SugoIO
  clear_first_login(user_id: string): SugoIO
}
```
### 示例
```js
sugoio.track_first_time('test_user_id', 'real_user_id', function (err) { console.log(err) });
sugoio.track_first_time('test_user_id', 'real_user_id');
sugoio.track_first_time('test_user_id', function (err) { console.log(err) });
sugoio.clear_first_login('test_user_id')
```

# v1.3.0 (2017-11-16)
+ 上报数据代码支持ie8+
  如果要支持ie8及ie9，必须使用ie __标准模式__，需要在html中添加如下代码：
  ```html
  <!-- DOCTYPE 必须是合法的 -->
  <!DOCTYPE html>
  <head>
  <!-- X-UA-Compatible 推荐使用如下设置 -->
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  </head>
  ```
  该内容定义文档使用ie标准模式渲染，这是上报数据能在ie8\9下运行的必要条件。
  该设置是兼容ie网站的渲染与js引擎的最优设置方式。
  当然你也可以使用其他设置使得你的网站采用标准模式渲染，详细设置参考：
  
  + [合法DOCTYPE列表](https://www.w3.org/QA/2002/04/valid-dtd-list.html)
  + https://msdn.microsoft.com/en-us/library/ff955275(v=vs.85).aspx
  + https://hsivonen.fi/doctype/
  + https://hsivonen.fi/doctype/#ie8modes
  + https://hsivonen.fi/doctype/ie8-mode.png
  
+ 默认关闭高级选项，删除开启高级选项switch，由用户输入的code与关联元素决定是否开启高级选项
+ 用户从高级选项切换到其他编辑项时，自动切换页面状态由关联元素选择状态变为编辑状态
+ 修复埋点事件页面路径属性展示错误

__ie8\9兼容模式下上报数据的支持视需求强烈而定__

# v1.2.33 (2017-11-13)
+ 修复部署代码多次写入配置的bug。
+ UI优化：埋点圈选按钮增加生效与无效的状态。

# v1.2.23 (2017-11-11)
+ 重构部署代码逻辑,修复隐患

# v1.2.8 (2017-11-02)
+ UI升级
+ 默认开启事件高级选项
+ 关联元素同类有效配置默认变为false
+ 非编辑状态下,鼠标移动时不再圈选页面元素

# v1.2.7(2017-11-01)
+ 开放Debug工具函数
+ 修复部署代码bug

# v1.2.6 (2017-10-16)
+ 兼容旧页面配置   
+ 兼容旧页面事件
+ 优化拖动元素，所有的元素都只能拖动标题部份，以提升输入内容时体验。

# v1.2.5 (2017-09-26)
+ 删除重复内容字段：referrer、sugo_user_agent、sugo_args

# v1.2.4 (2017-09-23)
+ 同类元素增加可选限制配置，包括id、class与自定义
+ 页面路径最大长度由50变为2048

# v1.2.2 (2017-09-20)
+ 修复app_host配置：如果app_host中没有 protocol，则会加上当前页面的 protocol。
  该配置会影响sugoio-last.min.js加载以及上报与请求数据的接口。

# v1.2.1 (2017-09-18)
+ 优化路径生成规则：
  + 如果生成的最优路径对应多个元素，生成全量路径来代替之前的报错
  + 同类元素使用全量路径匹配

+ 增强同类元素选择
  + 同类元素路径与元素本身路径分离
  + 同类元素各个元素的父级影响范围可任意定制
  
+ 增加忽略编辑器操作：按住`ctrl`(windows\linux)或`command`(OSX)键
+ UI与交互优化、统一

# v1.0.0 (2017-08-29)
### 新增功能
+ 新增页面元素关联维度功能
+ 新增页面路径通配符功能
+ 新增页面分类名称匹配功能
### 优化
+ UI全部重构
+ 代码使用vue重构
+ 性能优化
+ 其他bug修复

# v0.2.6 (2017-06-07)
+ 修复多次调用`sugoio.init`产生的数据被覆盖的bug。
+ 点击编辑器之外的元素时，`已创建事件`面板会被隐藏。
+ 修复删除已埋点事件时UI有时不能同步的问题。
+ 删除此前es5\6混合代码，统一转为es5，增加可读性及性能。
+ 修复一些功能函数中的bug。
+ 更详细的日志，以便排查错误。

# v0.2.5 (2017-05-25)
+ 添加`system_name`字段

