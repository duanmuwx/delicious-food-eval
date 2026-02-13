var dateUtil = require('../../utils/date')
var auth = require('../../utils/auth')
var shareUtil = require('../../utils/share')
var cloudUtil = require('../../utils/cloud')

// 模板 ID，需要替换为微信公众平台申请的实际模板 ID
var SUBSCRIBE_TMPL_ID = 'YOUR_TEMPLATE_ID'

Page({
  data: {
    today: '',
    todayDisplay: '',
    breakfastDishes: [],
    lunchDishes: [],
    dinnerDishes: [],
    loading: true,
    lunchSubscribed: false,
    dinnerSubscribed: false
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
    return auth.ensureLogin().then(function () {
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
    this.loadDishes().then(function () {
      wx.stopPullDownRefresh()
    })
  },

  onSubscribeTap: function (e) {
    var that = this
    var meal = e.currentTarget.dataset.meal
    wx.requestSubscribeMessage({
      tmplIds: [SUBSCRIBE_TMPL_ID],
      success: function (res) {
        if (res[SUBSCRIBE_TMPL_ID] === 'accept') {
          cloudUtil.callCloud('subscribeMenu', { action: 'subscribe', meal: meal }).then(function () {
            var key = meal + 'Subscribed'
            var update = {}
            update[key] = true
            that.setData(update)
            var label = meal === 'lunch' ? '午餐' : '晚餐'
            wx.showToast({ title: '已订阅明日' + label + '提醒', icon: 'none' })
          })
        }
      }
    })
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
