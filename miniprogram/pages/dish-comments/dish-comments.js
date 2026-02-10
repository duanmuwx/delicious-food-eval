var auth = require('../../utils/auth')
var cloudUtil = require('../../utils/cloud')

Page({
  data: {
    dishId: '',
    dish: null,
    comments: [],
    loading: true
  },

  onLoad: function (options) {
    this.setData({ dishId: options.dishId })
    this.loadComments()
  },

  loadComments: function () {
    var that = this
    that.setData({ loading: true })
    auth.ensureLogin().then(function () {
      return cloudUtil.callCloud('getDishRatings', {
        dishId: that.data.dishId
      })
    }).then(function (res) {
      var dish = res.dish || {}
      var avgScore = dish.avgScore || 0
      dish.avgScoreText = avgScore.toFixed(1)

      var comments = (res.comments || []).map(function (c) {
        var displayName = c.nickName || '匿名用户'
        var displayAvatar = c.avatarUrl || ''
        // 格式化时间
        var dateText = c.date || ''
        return {
          _id: c._id,
          nickName: displayName,
          avatarUrl: displayAvatar,
          score: c.score,
          comment: c.comment,
          dateText: dateText
        }
      })

      that.setData({
        dish: dish,
        comments: comments,
        loading: false
      })
    }).catch(function (err) {
      console.error('loadComments error:', err)
      that.setData({ loading: false })
    })
  },

  onPullDownRefresh: function () {
    this.loadComments()
    wx.stopPullDownRefresh()
  }
})
