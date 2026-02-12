var auth = require('../../utils/auth')
var cloudUtil = require('../../utils/cloud')

Page({
  data: {
    dishId: '',
    dishIds: [],
    dish: null,
    comments: [],
    loading: true
  },

  onLoad: function (options) {
    // 支持单个 dishId 或多个 dishIds（JSON数组字符串）
    var dishIds = []
    if (options.dishIds) {
      try { dishIds = JSON.parse(decodeURIComponent(options.dishIds)) } catch (e) { dishIds = [] }
    }
    if (dishIds.length === 0 && options.dishId) {
      dishIds = [options.dishId]
    }
    this.setData({ dishId: dishIds[0] || '', dishIds: dishIds })
    this.loadComments()
  },

  loadComments: function () {
    var that = this
    that.setData({ loading: true })
    auth.ensureLogin().then(function () {
      return cloudUtil.callCloud('getDishRatings', {
        dishId: that.data.dishId,
        dishIds: that.data.dishIds
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
