var dateUtil = require('../../utils/date')
var auth = require('../../utils/auth')
var cloudUtil = require('../../utils/cloud')

Page({
  data: {
    dishId: '',
    dish: {},
    myScore: 0,
    myComment: '',
    existingRatingId: null,
    submitting: false,
    loading: true
  },

  onLoad: function (options) {
    this.setData({ dishId: options.dishId })
    this.loadData()
  },

  loadData: function () {
    var that = this
    that.setData({ loading: true })
    auth.ensureLogin().then(function (openid) {
      var db = wx.cloud.database()
      return Promise.all([
        db.collection('dishes').doc(that.data.dishId).get(),
        db.collection('ratings').where({
          dishId: that.data.dishId,
          userId: openid,
          date: dateUtil.getToday()
        }).get()
      ])
    }).then(function (results) {
      var dish = results[0].data
      var ratingData = results[1].data
      var existingRating = ratingData.length > 0 ? ratingData[0] : null

      that.setData({
        dish: dish,
        myScore: existingRating ? existingRating.score : 0,
        myComment: existingRating ? (existingRating.comment || '') : '',
        existingRatingId: existingRating ? existingRating._id : null,
        loading: false
      })
    }).catch(function (err) {
      console.error('loadData error:', err)
      that.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    })
  },

  onScoreChange: function (e) {
    this.setData({ myScore: e.detail.value })
  },

  onCommentInput: function (e) {
    this.setData({ myComment: e.detail.value })
  },

  onSubmit: function () {
    var that = this
    if (that.data.myScore === 0) {
      wx.showToast({ title: '请先选择评分', icon: 'none' })
      return
    }
    that.setData({ submitting: true })
    cloudUtil.callCloud('submitRating', {
      dishId: that.data.dishId,
      score: that.data.myScore,
      comment: that.data.myComment.trim().slice(0, 50),
      date: dateUtil.getToday()
    }).then(function () {
      wx.showToast({ title: '评分成功', icon: 'success' })
      setTimeout(function () {
        that.loadData()
      }, 500)
    }).catch(function () {
      wx.showToast({ title: '评分失败', icon: 'none' })
    }).then(function () {
      that.setData({ submitting: false })
    })
  }
})
