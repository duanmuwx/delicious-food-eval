var auth = require('../../utils/auth')
var dateUtil = require('../../utils/date')

Page({
  data: {
    isAdmin: false,
    ratingHistory: [],
    loading: true
  },

  onShow: function () {
    this.loadData()
  },

  loadData: function () {
    var that = this
    that.setData({ loading: true })
    auth.ensureLogin().then(function (openid) {
      that.setData({ isAdmin: auth.isAdmin() })
      var db = wx.cloud.database()
      // 查询用户的评分历史，按日期倒序
      return db.collection('ratings')
        .where({ userId: openid })
        .orderBy('date', 'desc')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get()
    }).then(function (res) {
      var ratings = res.data
      if (ratings.length === 0) {
        that.setData({ ratingHistory: [], loading: false })
        return
      }
      // 获取关联的菜品信息
      var dishIds = []
      ratings.forEach(function (r) {
        if (dishIds.indexOf(r.dishId) === -1) {
          dishIds.push(r.dishId)
        }
      })
      var db = wx.cloud.database()
      var _ = db.command
      return db.collection('dishes')
        .where({ _id: _.in(dishIds) })
        .get()
        .then(function (dishRes) {
          var dishMap = {}
          dishRes.data.forEach(function (d) {
            dishMap[d._id] = d
          })
          var history = ratings.map(function (r) {
            var dish = dishMap[r.dishId] || {}
            return {
              _id: r._id,
              dishName: dish.name || '已删除菜品',
              score: r.score,
              comment: r.comment || '',
              date: r.date,
              dateDisplay: dateUtil.formatDateChinese(r.date)
            }
          })
          that.setData({ ratingHistory: history, loading: false })
        })
    }).catch(function (err) {
      console.error('loadData error:', err)
      that.setData({ loading: false })
    })
  },

  goAdmin: function () {
    wx.navigateTo({ url: '/pages/admin/admin' })
  }
})
