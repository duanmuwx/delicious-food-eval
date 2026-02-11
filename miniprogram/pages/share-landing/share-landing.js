var dateUtil = require('../../utils/date')
var shareUtil = require('../../utils/share')

var mealMap = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐'
}

var mealEmoji = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙'
}

Page({
  data: {
    date: '',
    dateDisplay: '',
    meal: '',
    mealName: '',
    mealEmoji: '',
    dishes: [],
    loading: true
  },

  onLoad: function (options) {
    var date = options.date || dateUtil.getToday()
    var meal = options.meal || 'lunch'
    if (!mealMap[meal]) meal = 'lunch'
    this.setData({
      date: date,
      dateDisplay: dateUtil.formatDateChinese(date),
      meal: meal,
      mealName: mealMap[meal] || '午餐',
      mealEmoji: mealEmoji[meal] || '☀️'
    })
    this.loadDishes(date, meal)
  },

  loadDishes: function (date, meal) {
    var that = this
    var db = wx.cloud.database()
    db.collection('dishes')
      .where({ date: date, meal: meal })
      .orderBy('createdAt', 'asc')
      .get()
      .then(function (res) {
        that.setData({ dishes: res.data, loading: false })
      })
      .catch(function (err) {
        console.error('share-landing loadDishes error:', err)
        that.setData({ loading: false })
      })
  },

  onGoHome: function () {
    wx.switchTab({ url: '/pages/home/home' })
  },

  onDishTap: function (e) {
    var dishId = e.detail.dishId
    wx.navigateTo({ url: '/pages/rate/rate?dishId=' + dishId })
  },

  onShareAppMessage: function () {
    var dishes = this.data.dishes
    var names = dishes.map(function (d) { return d.name })
    var title = shareUtil.generateShareTitle(this.data.mealName, names)
    var imageUrl = shareUtil.getFirstImageUrl(dishes)

    return {
      title: title,
      path: '/pages/share-landing/share-landing?date=' + this.data.date + '&meal=' + this.data.meal,
      imageUrl: imageUrl || undefined
    }
  }
})
