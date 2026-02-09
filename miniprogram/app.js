App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-5g6irawxd736c90e',
        traceUser: true
      })
    }
    this.globalData = {
      openid: null,
      isAdmin: false
    }
  },
  globalData: {
    openid: null,
    isAdmin: false
  }
})
