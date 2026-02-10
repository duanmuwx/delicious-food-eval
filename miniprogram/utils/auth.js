var cloud = require('./cloud')

function ensureLogin() {
  var app = getApp()
  if (app.globalData.openid) {
    return Promise.resolve(app.globalData.openid)
  }
  return cloud.callCloud('login').then(function (res) {
    app.globalData.openid = res.openid
    app.globalData.isAdmin = res.isAdmin || false
    app.globalData.hasProfile = res.hasProfile || false
    app.globalData.nickName = res.nickName || ''
    app.globalData.avatarUrl = res.avatarUrl || ''
    return res.openid
  })
}

function isAdmin() {
  return getApp().globalData.isAdmin
}

function hasProfile() {
  return getApp().globalData.hasProfile
}

function getProfile() {
  var app = getApp()
  return {
    nickName: app.globalData.nickName,
    avatarUrl: app.globalData.avatarUrl
  }
}

function updateLocalProfile(nickName, avatarUrl) {
  var app = getApp()
  app.globalData.hasProfile = true
  app.globalData.nickName = nickName
  app.globalData.avatarUrl = avatarUrl
}

module.exports = {
  ensureLogin: ensureLogin,
  isAdmin: isAdmin,
  hasProfile: hasProfile,
  getProfile: getProfile,
  updateLocalProfile: updateLocalProfile
}
