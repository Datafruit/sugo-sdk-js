'use strict'

var express      = require('express')
var cookieParser = require('cookie-parser')
var logger       = require('morgan')

var app = express()

app.use(cookieParser())
app.use(logger('dev'))

//设置跨域访问
// app.all('*', function(req, res, next) {
//   // res.header('Access-Control-Allow-Origin', '*')
//   // res.header('Access-Control-Allow-Headers', 'X-Requested-With')
//   // res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Engaged-Auth-Token,Authorization')
//   // res.header('Access-Control-Allow-Methods','PUT,POST,GET,DELETE,OPTIONS')
//   // res.header('Access-Control-Allow-Credentials', true)

//   next()
// })

app.use('/tests', express.static(__dirname + '/tests'))
app.use('/private', express.static(__dirname + '/private'))
app.use('/vue-admin', express.static(__dirname + '/private/vue-admin'))
app.use('/assets', express.static(__dirname + '/private/vue-admin/assets/'))
app.use('/yufp-web', express.static(__dirname + '/private/yufp-web'))
app.get('/tests/cookie_included/:cookieName', function(req, res) {
  if (req.cookies && req.cookies[req.params.cookieName]) {
    res.json(1)
  } else {
    res.json(0)
  }
})
app.use(express.static(__dirname))
app.get('/', function(req, res) {
  
  res.redirect(301, '/tests/')
})

var server = app.listen(4000, function () {
  console.log('sugoio test app listening on port %s', server.address().port)
})
