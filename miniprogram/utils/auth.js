var cloud = require('./cloud')

function ensureLogin() {
  var app = getApp()
  if (app.globalData.openid) {
    return Promise.resolve(app.globalData.openid)
  }
  return cloud.callCloud('login').then(function (res) {
    app.globalData.openid = res.openid
    app.globalData.isAdmin = res.isAdmin || false
    return res.openid
  })
}

function isAdmin() {
  return getApp().globalData.isAdmin
}

module.exports = {
  ensureLogin: ensureLogin,
  isAdmin: isAdmin
}
