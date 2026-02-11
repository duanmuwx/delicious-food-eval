var dateUtil = require('../../utils/date')
var auth = require('../../utils/auth')
var shareUtil = require('../../utils/share')

Page({
  data: {
    today: '',
    todayDisplay: '',
    breakfastDishes: [],
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
        breakfastDishes: dishes.filter(function (d) { return d.meal === 'breakfast' }),
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
  },

  onShareAppMessage: function () {
    var hour = new Date().getHours()
    var meal = 'lunch'
    var mealName = '午餐'
    if (hour < 10) {
      meal = 'breakfast'
      mealName = '早餐'
    } else if (hour >= 16) {
      meal = 'dinner'
      mealName = '晚餐'
    }

    var mealDishes = this.data[meal === 'breakfast' ? 'breakfastDishes' : meal === 'lunch' ? 'lunchDishes' : 'dinnerDishes']
    var names = mealDishes.map(function (d) { return d.name })
    var title = shareUtil.generateShareTitle(mealName, names)
    var imageUrl = shareUtil.getFirstImageUrl(mealDishes)

    return {
      title: title,
      path: '/pages/share-landing/share-landing?date=' + this.data.today + '&meal=' + meal,
      imageUrl: imageUrl || undefined
    }
  }
})
