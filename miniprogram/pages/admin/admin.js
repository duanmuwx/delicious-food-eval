var auth = require('../../utils/auth')
var dateUtil = require('../../utils/date')
var cloudUtil = require('../../utils/cloud')

Page({
  data: {
    // 表单
    dishName: '',
    mealIndex: 0,
    mealOptions: ['午餐', '晚餐'],
    mealValues: ['lunch', 'dinner'],
    date: '',
    imageFilePath: '',
    // 今日菜品列表
    todayDishes: [],
    // 历史菜品
    historyKeyword: '',
    historyResults: [],
    showHistory: false,
    // 状态
    submitting: false,
    loading: true,
    // 编辑弹窗
    showEditModal: false,
    editDish: null,
    editDescription: '',
    editImagePath: '',
    editImageChanged: false,
    editSubmitting: false
  },

  onLoad: function () {
    // 校验管理员身份
    var that = this
    auth.ensureLogin().then(function () {
      if (!auth.isAdmin()) {
        wx.showToast({ title: '无管理员权限', icon: 'none' })
        setTimeout(function () {
          wx.navigateBack()
        }, 1500)
        return
      }
      that.setData({ date: dateUtil.getToday() })
      that.loadTodayDishes()
    })
  },

  onShow: function () {
    if (auth.isAdmin() && this.data.date) {
      this.loadTodayDishes()
    }
  },

  // 加载当日菜品
  loadTodayDishes: function () {
    var that = this
    that.setData({ loading: true })
    var db = wx.cloud.database()
    db.collection('dishes')
      .where({ date: that.data.date })
      .orderBy('meal', 'asc')
      .orderBy('createdAt', 'asc')
      .get()
      .then(function (res) {
        that.setData({ todayDishes: res.data, loading: false })
      })
      .catch(function (err) {
        console.error('loadTodayDishes error:', err)
        that.setData({ loading: false })
      })
  },

  // 表单输入
  onNameInput: function (e) {
    this.setData({ dishName: e.detail.value })
  },

  onMealChange: function (e) {
    this.setData({ mealIndex: e.detail.value })
  },

  onDateChange: function (e) {
    this.setData({ date: e.detail.value })
    this.loadTodayDishes()
  },

  // 选择图片
  onChooseImage: function () {
    var that = this
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        that.setData({ imageFilePath: res.tempFiles[0].tempFilePath })
      }
    })
  },

  onRemoveImage: function () {
    this.setData({ imageFilePath: '' })
  },

  // 提交添加菜品
  onSubmit: function () {
    var that = this
    var name = that.data.dishName.trim()
    if (!name) {
      wx.showToast({ title: '请输入菜名', icon: 'none' })
      return
    }

    that.setData({ submitting: true })

    var uploadPromise
    if (that.data.imageFilePath) {
      // 上传图片到云存储
      var cloudPath = 'dishes/' + Date.now() + '-' + Math.random().toString(36).substr(2, 8) + '.jpg'
      uploadPromise = wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: that.data.imageFilePath
      }).then(function (res) {
        return res.fileID
      })
    } else {
      uploadPromise = Promise.resolve('')
    }

    uploadPromise.then(function (fileID) {
      return cloudUtil.callCloud('addDish', {
        name: name,
        meal: that.data.mealValues[that.data.mealIndex],
        date: that.data.date,
        imageFileId: fileID
      })
    }).then(function () {
      wx.showToast({ title: '添加成功', icon: 'success' })
      that.setData({
        dishName: '',
        imageFilePath: '',
        submitting: false
      })
      that.loadTodayDishes()
    }).catch(function (err) {
      console.error('onSubmit error:', err)
      wx.showToast({ title: '添加失败', icon: 'none' })
      that.setData({ submitting: false })
    })
  },

  // 删除菜品
  onDeleteDish: function (e) {
    var that = this
    var dishId = e.detail.dishId
    wx.showModal({
      title: '确认删除',
      content: '删除后该菜品的所有评分也会被删除',
      success: function (res) {
        if (res.confirm) {
          cloudUtil.callCloud('deleteDish', { dishId: dishId })
            .then(function () {
              wx.showToast({ title: '已删除', icon: 'success' })
              that.loadTodayDishes()
            })
            .catch(function () {
              wx.showToast({ title: '删除失败', icon: 'none' })
            })
        }
      }
    })
  },

  // 历史菜品搜索
  onHistoryInput: function (e) {
    var keyword = e.detail.value.trim()
    this.setData({ historyKeyword: keyword })
    if (!keyword) {
      this.setData({ historyResults: [], showHistory: false })
      return
    }
    this.searchHistory(keyword)
  },

  searchHistory: function (keyword) {
    var that = this
    var db = wx.cloud.database()
    db.collection('dishes')
      .where({
        name: db.RegExp({
          regexp: keyword,
          options: 'i'
        })
      })
      .orderBy('date', 'desc')
      .limit(20)
      .get()
      .then(function (res) {
        // 去重：只保留每个菜名的最新一条
        var seen = {}
        var unique = []
        res.data.forEach(function (d) {
          if (!seen[d.name]) {
            seen[d.name] = true
            unique.push(d)
          }
        })
        that.setData({ historyResults: unique, showHistory: true })
      })
  },

  onPickHistory: function (e) {
    var name = e.currentTarget.dataset.name
    this.setData({
      dishName: name,
      historyKeyword: '',
      historyResults: [],
      showHistory: false
    })
  },

  // 编辑菜品
  onEditDish: function (e) {
    var dish = e.detail.dish
    this.setData({
      showEditModal: true,
      editDish: dish,
      editDescription: dish.description || '',
      editImagePath: dish.imageFileId || '',
      editImageChanged: false
    })
  },

  onCloseEdit: function () {
    this.setData({ showEditModal: false, editDish: null })
  },

  onEditDescInput: function (e) {
    this.setData({ editDescription: e.detail.value })
  },

  onEditChooseImage: function () {
    var that = this
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        that.setData({
          editImagePath: res.tempFiles[0].tempFilePath,
          editImageChanged: true
        })
      }
    })
  },

  onEditRemoveImage: function () {
    this.setData({ editImagePath: '', editImageChanged: true })
  },

  onSubmitEdit: function () {
    var that = this
    var dish = that.data.editDish
    that.setData({ editSubmitting: true })

    var uploadPromise
    if (that.data.editImageChanged && that.data.editImagePath) {
      var cloudPath = 'dishes/' + Date.now() + '-' + Math.random().toString(36).substr(2, 8) + '.jpg'
      uploadPromise = wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: that.data.editImagePath
      }).then(function (res) { return res.fileID })
    } else if (that.data.editImageChanged) {
      uploadPromise = Promise.resolve('')
    } else {
      uploadPromise = Promise.resolve(undefined)
    }

    uploadPromise.then(function (newFileId) {
      var params = {
        dishId: dish._id,
        description: that.data.editDescription
      }
      if (newFileId !== undefined) {
        params.imageFileId = newFileId
        params.oldImageFileId = dish.imageFileId || ''
      }
      return cloudUtil.callCloud('updateDish', params)
    }).then(function () {
      wx.showToast({ title: '已更新', icon: 'success' })
      that.setData({ showEditModal: false, editDish: null, editSubmitting: false })
      that.loadTodayDishes()
    }).catch(function () {
      wx.showToast({ title: '更新失败', icon: 'none' })
      that.setData({ editSubmitting: false })
    })
  }
})
