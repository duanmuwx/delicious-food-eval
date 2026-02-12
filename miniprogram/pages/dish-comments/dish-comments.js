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
        var dateText = c.date || ''
        return {
          _id: c._id,
          nickName: displayName,
          avatarUrl: displayAvatar,
          score: c.score,
          comment: c.comment,
          dateText: dateText,
          likeCount: c.likeCount || 0,
          liked: !!c.liked,
          isOwn: !!c.isOwn
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
  },

  onToggleLike: function (e) {
    var that = this
    var ratingId = e.currentTarget.dataset.id
    var index = e.currentTarget.dataset.index
    var comment = that.data.comments[index]
    if (comment.isOwn) return

    // 乐观更新
    var newLiked = !comment.liked
    var newCount = comment.likeCount + (newLiked ? 1 : -1)
    var key1 = 'comments[' + index + '].liked'
    var key2 = 'comments[' + index + '].likeCount'
    var update = {}
    update[key1] = newLiked
    update[key2] = newCount
    that.setData(update)

    cloudUtil.callCloud('toggleCommentLike', { ratingId: ratingId }).catch(function () {
      // 回滚
      var rollback = {}
      rollback[key1] = comment.liked
      rollback[key2] = comment.likeCount
      that.setData(rollback)
    })
  }
})
