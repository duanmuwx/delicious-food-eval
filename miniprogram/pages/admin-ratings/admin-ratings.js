var auth = require('../../utils/auth')
var cloudUtil = require('../../utils/cloud')

Page({
  data: {
    dishId: '',
    dishName: '',
    ratings: [],
    loading: true
  },

  onLoad: function (options) {
    this.setData({
      dishId: options.dishId,
      dishName: decodeURIComponent(options.dishName || '')
    })
    this.loadRatings()
  },

  loadRatings: function () {
    var that = this
    that.setData({ loading: true })
    auth.ensureLogin().then(function () {
      var db = wx.cloud.database()
      return db.collection('ratings')
        .where({ dishId: that.data.dishId })
        .orderBy('date', 'desc')
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get()
    }).then(function (res) {
      var ratings = res.data.map(function (r) {
        // 脱敏显示用户 ID：保留前4位和后4位
        var uid = r.userId || ''
        var maskedUid = uid.length > 8
          ? uid.substring(0, 4) + '****' + uid.substring(uid.length - 4)
          : uid
        return {
          _id: r._id,
          userId: maskedUid,
          score: r.score,
          comment: r.comment || '',
          date: r.date
        }
      })
      that.setData({ ratings: ratings, loading: false })
    }).catch(function (err) {
      console.error('loadRatings error:', err)
      that.setData({ loading: false })
    })
  },

  onDeleteRating: function (e) {
    var that = this
    var ratingId = e.currentTarget.dataset.ratingId
    wx.showModal({
      title: '确认删除',
      content: '删除后该评分将无法恢复，菜品分数将自动重算',
      success: function (res) {
        if (res.confirm) {
          cloudUtil.callCloud('deleteRating', {
            ratingId: ratingId,
            dishId: that.data.dishId
          }).then(function () {
            wx.showToast({ title: '已删除', icon: 'success' })
            that.loadRatings()
          }).catch(function () {
            wx.showToast({ title: '删除失败', icon: 'none' })
          })
        }
      }
    })
  }
})
