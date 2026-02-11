var auth = require('../../utils/auth')
var dateUtil = require('../../utils/date')
var cloudUtil = require('../../utils/cloud')
var shareUtil = require('../../utils/share')

Page({
  data: {
    // 表单
    dishName: '',
    mealIndex: 0,
    mealOptions: ['早餐', '午餐', '晚餐'],
    mealValues: ['breakfast', 'lunch', 'dinner'],
    date: '',
    imageFilePath: '',
    // 今日菜品列表
    todayDishes: [],
    // 历史导入弹窗
    showImportPopup: false,
    importKeyword: '',
    importList: [],
    importSelected: {},
    importSelectedCount: 0,
    importLoading: false,
    importSubmitting: false,
    // 状态
    submitting: false,
    loading: true,
    // 分享提示
    showSharePrompt: false,
    // 编辑弹窗
    showEditModal: false,
    editDish: null,
    editDescription: '',
    editImagePath: '',
    editImageChanged: false,
    editSubmitting: false
  },

  onLoad: function (options) {
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
      var date = options.date || dateUtil.getToday()
      that.setData({ date: date })
      if (options.meal) {
        var mealIdx = that.data.mealValues.indexOf(options.meal)
        if (mealIdx !== -1) {
          that.setData({ mealIndex: mealIdx })
        }
      }
      that.loadTodayDishes()
    })
  },

  onGoWeekly: function () {
    wx.navigateTo({ url: '/pages/weekly/weekly' })
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
        that._checkSharePrompt(res.data)
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
    this._checkSharePrompt(this.data.todayDishes)
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

  // 点击菜品查看评分列表
  onDishTap: function (e) {
    var dishId = e.detail.dishId
    var dish = this.data.todayDishes.filter(function (d) { return d._id === dishId })[0]
    var dishName = dish ? dish.name : ''
    wx.navigateTo({
      url: '/pages/admin-ratings/admin-ratings?dishId=' + dishId + '&dishName=' + encodeURIComponent(dishName)
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

  // 历史导入弹窗
  onOpenImport: function () {
    this.setData({
      showImportPopup: true,
      importKeyword: '',
      importSelected: {},
      importSelectedCount: 0
    })
    this.loadImportList('')
  },

  onCloseImport: function () {
    this.setData({ showImportPopup: false })
  },

  onImportSearch: function (e) {
    var keyword = e.detail.value.trim()
    this.setData({ importKeyword: keyword, importSelected: {}, importSelectedCount: 0 })
    this.loadImportList(keyword)
  },

  loadImportList: function (keyword) {
    var that = this
    that.setData({ importLoading: true })
    cloudUtil.callCloud('searchDishHistory', {
      meal: that.data.mealValues[that.data.mealIndex],
      keyword: keyword || ''
    }).then(function (res) {
      that.setData({ importList: res.data || [], importLoading: false })
    }).catch(function () {
      that.setData({ importList: [], importLoading: false })
    })
  },

  onToggleImportItem: function (e) {
    var idx = e.currentTarget.dataset.idx
    var key = 'importSelected.' + idx
    var selected = !this.data.importSelected[idx]
    var countDelta = selected ? 1 : -1
    this.setData({
      [key]: selected,
      importSelectedCount: this.data.importSelectedCount + countDelta
    })
  },

  onConfirmImport: function () {
    var that = this
    var selected = that.data.importSelected
    var list = that.data.importList
    var dishes = []
    for (var i = 0; i < list.length; i++) {
      if (selected[i]) {
        dishes.push({
          name: list[i].name,
          meal: that.data.mealValues[that.data.mealIndex],
          date: that.data.date,
          imageFileId: list[i].lastImageFileId
        })
      }
    }
    if (!dishes.length) {
      wx.showToast({ title: '请选择菜品', icon: 'none' })
      return
    }
    that.setData({ importSubmitting: true })
    cloudUtil.callCloud('batchAddDish', { dishes: dishes })
      .then(function (res) {
        wx.showToast({ title: '已添加' + res.added + '道菜', icon: 'success' })
        that.setData({ showImportPopup: false, importSubmitting: false })
        that.loadTodayDishes()
      })
      .catch(function () {
        wx.showToast({ title: '添加失败', icon: 'none' })
        that.setData({ importSubmitting: false })
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
  },

  // 分享提示：当前餐次≥3道菜时提示，每天每餐次只提示一次
  _checkSharePrompt: function (dishes) {
    var meal = this.data.mealValues[this.data.mealIndex]
    var mealDishes = dishes.filter(function (d) { return d.meal === meal })
    if (mealDishes.length < 3) {
      this.setData({ showSharePrompt: false })
      return
    }
    var key = 'share_prompt_' + this.data.date + '_' + meal
    if (wx.getStorageSync(key)) {
      this.setData({ showSharePrompt: false })
      return
    }
    this.setData({ showSharePrompt: true })
  },

  onDismissSharePrompt: function () {
    var meal = this.data.mealValues[this.data.mealIndex]
    var key = 'share_prompt_' + this.data.date + '_' + meal
    wx.setStorageSync(key, true)
    this.setData({ showSharePrompt: false })
  },

  onShareAppMessage: function () {
    var meal = this.data.mealValues[this.data.mealIndex]
    var mealName = this.data.mealOptions[this.data.mealIndex]
    var dishes = this.data.todayDishes.filter(function (d) { return d.meal === meal })
    var names = dishes.map(function (d) { return d.name })
    var title = shareUtil.generateShareTitle(mealName, names)
    var imageUrl = shareUtil.getFirstImageUrl(dishes)

    // 分享后标记已提示
    var key = 'share_prompt_' + this.data.date + '_' + meal
    wx.setStorageSync(key, true)
    this.setData({ showSharePrompt: false })

    return {
      title: title,
      path: '/pages/share-landing/share-landing?date=' + this.data.date + '&meal=' + meal,
      imageUrl: imageUrl || undefined
    }
  }
})
