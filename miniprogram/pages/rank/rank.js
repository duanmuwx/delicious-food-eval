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
    return auth.ensureLogin().then(function () {
      return cloudUtil.callCloud('getRanking', {
        type: that.data.currentTab
      })
    }).then(function (res) {
      var list = res.data || []
      list.forEach(function (item) {
        var score = item.avgScore || 0
        item.avgScoreText = score.toFixed(1)
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
    this.loadRanking().then(function () {
      wx.stopPullDownRefresh()
    })
  },

  onDishTap: function (e) {
    var dishIds = e.currentTarget.dataset.dishIds
    var dishName = e.currentTarget.dataset.dishName
    wx.navigateTo({
      url: '/pages/dish-comments/dish-comments?dishIds=' + encodeURIComponent(JSON.stringify(dishIds)) + '&dishName=' + encodeURIComponent(dishName)
    })
  }
})
