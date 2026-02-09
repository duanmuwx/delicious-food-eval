var dateUtil = require('../../utils/date')
var auth = require('../../utils/auth')

Page({
  data: {
    today: '',
    todayDisplay: '',
    lunchDishes: [],
    dinnerDishes: [],
    loading: true
  },

  onLoad: function () {
    var today = dateUtil.getToday()
    this.setData({
      today: today,
      todayDisplay: dateUtil.formatDateChinese(today)
    })
  },

  onShow: function () {
    this.loadDishes()
  },

  loadDishes: function () {
    var that = this
    that.setData({ loading: true })
    auth.ensureLogin().then(function () {
      var db = wx.cloud.database()
      return db.collection('dishes')
        .where({ date: that.data.today })
        .orderBy('meal', 'asc')
        .orderBy('createdAt', 'asc')
        .get()
    }).then(function (res) {
      var dishes = res.data
      that.setData({
        lunchDishes: dishes.filter(function (d) { return d.meal === 'lunch' }),
        dinnerDishes: dishes.filter(function (d) { return d.meal === 'dinner' }),
        loading: false
      })
    }).catch(function (err) {
      console.error('loadDishes error:', err)
      that.setData({ loading: false })
    })
  },

  onDishTap: function (e) {
    var dishId = e.detail.dishId
    wx.navigateTo({ url: '/pages/rate/rate?dishId=' + dishId })
  },

  onPullDownRefresh: function () {
    var that = this
    that.loadDishes()
    wx.stopPullDownRefresh()
  }
})
