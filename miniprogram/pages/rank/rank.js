var auth = require('../../utils/auth')
var cloudUtil = require('../../utils/cloud')

Page({
  data: {
    currentTab: 'week',
    rankList: [],
    loading: true
  },

  onShow: function () {
    this.loadRanking()
  },

  onTabChange: function (e) {
    var tab = e.currentTarget.dataset.tab
    if (tab === this.data.currentTab) return
    this.setData({ currentTab: tab })
    this.loadRanking()
  },

  loadRanking: function () {
    var that = this
    that.setData({ loading: true })
    auth.ensureLogin().then(function () {
      return cloudUtil.callCloud('getRanking', {
        type: that.data.currentTab
      })
    }).then(function (res) {
      var list = res.data || []
      list.forEach(function (item) {
        var score = item.avgScore || 0
        item.avgScoreText = score.toFixed(1)
        var full = Math.floor(score)
        var stars = []
        for (var i = 0; i < 5; i++) {
          stars.push(i < full ? 'active' : '')
        }
        item.stars = stars
      })
      that.setData({
        rankList: list,
        loading: false
      })
    }).catch(function (err) {
      console.error('loadRanking error:', err)
      that.setData({ loading: false })
    })
  },

  onPullDownRefresh: function () {
    this.loadRanking()
    wx.stopPullDownRefresh()
  }
})
