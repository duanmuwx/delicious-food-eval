var auth = require('../../utils/auth')
var dateUtil = require('../../utils/date')

Page({
  data: {
    weekOffset: 0,
    weekLabel: '',
    today: '',
    days: [],
    mealKeys: ['breakfast', 'lunch', 'dinner'],
    mealLabels: ['早餐', '午餐', '晚餐'],
    loading: true
  },

  onLoad: function () {
    var that = this
    that.setData({ today: dateUtil.getToday() })
    auth.ensureLogin().then(function () {
      if (!auth.isAdmin()) {
        wx.showToast({ title: '无管理员权限', icon: 'none' })
        setTimeout(function () { wx.navigateBack() }, 1500)
        return
      }
      that.loadWeek()
    })
  },

  onShow: function () {
    if (auth.isAdmin() && this.data.today) {
      this.loadWeek()
    }
  },

  onPrevWeek: function () {
    this.setData({ weekOffset: this.data.weekOffset - 1 })
    this.loadWeek()
  },

  onNextWeek: function () {
    this.setData({ weekOffset: this.data.weekOffset + 1 })
    this.loadWeek()
  },

  // 分页获取所有匹配的dishes（客户端每次最多返回20条）
  _fetchAllDishes: function (query) {
    var all = []
    var batchSize = 20
    function fetch(skip) {
      return query.skip(skip).limit(batchSize).get().then(function (res) {
        all = all.concat(res.data)
        if (res.data.length === batchSize) {
          return fetch(skip + batchSize)
        }
        return all
      })
    }
    return fetch(0)
  },

  loadWeek: function () {
    var that = this
    that.setData({ loading: true })

    var range = dateUtil.getWeekRangeByOffset(that.data.weekOffset)
    var weekLabel = dateUtil.formatDateChinese(range.start) + ' - ' + dateUtil.formatDateChinese(range.end)
    that.setData({ weekLabel: weekLabel })

    var db = wx.cloud.database()
    var _ = db.command
    var query = db.collection('dishes')
      .where({
        date: _.gte(range.start).and(_.lte(range.end))
      })
      .field({ date: true, meal: true })

    that._fetchAllDishes(query)
      .then(function (allDishes) {
        var countMap = {}
        for (var i = 0; i < allDishes.length; i++) {
          var dish = allDishes[i]
          if (!countMap[dish.date]) {
            countMap[dish.date] = { breakfast: 0, lunch: 0, dinner: 0 }
          }
          if (countMap[dish.date][dish.meal] !== undefined) {
            countMap[dish.date][dish.meal]++
          }
        }

        var mealKeys = that.data.mealKeys
        var days = []
        for (var j = 0; j < range.dates.length; j++) {
          var date = range.dates[j]
          var cm = countMap[date] || { breakfast: 0, lunch: 0, dinner: 0 }
          var mealsArr = []
          for (var k = 0; k < mealKeys.length; k++) {
            mealsArr.push({ key: mealKeys[k], count: cm[mealKeys[k]] || 0 })
          }
          days.push({
            date: date,
            label: dateUtil.formatDateChinese(date),
            dayLabel: dateUtil.getDayOfWeekLabel(date),
            isToday: date === that.data.today,
            meals: mealsArr
          })
        }

        that.setData({ days: days, loading: false })
      })
      .catch(function (err) {
        console.error('loadWeek error:', err)
        that.setData({ loading: false })
      })
  },

  onCellTap: function (e) {
    var date = e.currentTarget.dataset.date
    var meal = e.currentTarget.dataset.meal
    wx.navigateTo({
      url: '/pages/admin/admin?date=' + date + '&meal=' + meal
    })
  }
})
