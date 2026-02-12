var auth = require('../../utils/auth')
var dateUtil = require('../../utils/date')
var cloudUtil = require('../../utils/cloud')

Page({
  data: {
    isAdmin: false,
    hasProfile: false,
    nickName: '',
    avatarUrl: '',
    ratingHistory: [],
    loading: true,
    totalRatings: 0,
    totalDishes: 0,
    weekRatings: 0
  },

  onShow: function () {
    this.loadData()
  },

  loadData: function () {
    var that = this
    that.setData({ loading: true })
    auth.ensureLogin().then(function (openid) {
      that.setData({
        isAdmin: auth.isAdmin(),
        hasProfile: auth.hasProfile(),
        nickName: auth.getProfile().nickName,
        avatarUrl: auth.getProfile().avatarUrl
      })
      that.loadStats(openid)
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
              dishId: r.dishId,
              dishName: dish.name || '已删除菜品',
              score: r.score,
              comment: r.comment || '',
              date: r.date,
              dateDisplay: r.createdAt ? dateUtil.formatDateTime(r.createdAt) : (r.date ? dateUtil.formatDateChinese(r.date) : '')
            }
          })
          that.setData({ ratingHistory: history, loading: false })
        })
    }).catch(function (err) {
      console.error('loadData error:', err)
      that.setData({ loading: false })
    })
  },

  loadStats: function (openid) {
    var that = this
    var db = wx.cloud.database()
    var _ = db.command
    var weekRange = dateUtil.getWeekRange()

    // 总评价数
    db.collection('ratings').where({ userId: openid }).count().then(function (res) {
      that.setData({ totalRatings: res.total })
    })

    // 评价菜品数（去重 dishId）
    db.collection('ratings').where({ userId: openid }).field({ dishId: true }).limit(500).get().then(function (res) {
      var ids = {}
      res.data.forEach(function (r) { ids[r.dishId] = true })
      that.setData({ totalDishes: Object.keys(ids).length })
    })

    // 本周评价数
    db.collection('ratings').where({
      userId: openid,
      date: _.gte(weekRange.start).and(_.lte(weekRange.end))
    }).count().then(function (res) {
      that.setData({ weekRatings: res.total })
    })
  },

  goAdmin: function () {
    wx.navigateTo({ url: '/pages/admin/admin' })
  },

  goProfile: function () {
    wx.navigateTo({ url: '/pages/profile/profile' })
  },

  onDeleteRating: function (e) {
    var that = this
    var ratingId = e.currentTarget.dataset.ratingId
    var dishId = e.currentTarget.dataset.dishId
    wx.showModal({
      title: '确认删除',
      content: '删除后该评分将无法恢复',
      success: function (res) {
        if (res.confirm) {
          cloudUtil.callCloud('deleteRating', {
            ratingId: ratingId,
            dishId: dishId
          }).then(function () {
            wx.showToast({ title: '已删除', icon: 'success' })
            that.loadData()
          }).catch(function () {
            wx.showToast({ title: '删除失败', icon: 'none' })
          })
        }
      }
    })
  }
})
