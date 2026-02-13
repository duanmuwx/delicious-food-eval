var dateUtil = require('../../utils/date')
var auth = require('../../utils/auth')
var cloudUtil = require('../../utils/cloud')
var cache = require('../../utils/cache')

Page({
  data: {
    dishId: '',
    dish: {},
    myScore: 0,
    myComment: '',
    existingRatingId: null,
    submitting: false,
    loading: true,
    imageUploading: false
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

  onViewComments: function () {
    var dish = this.data.dish
    wx.navigateTo({
      url: '/pages/dish-comments/dish-comments?dishId=' + this.data.dishId + '&dishName=' + encodeURIComponent(dish.name || '')
    })
  },

  onUploadImage: function () {
    var that = this
    if (that.data.imageUploading) return

    // 检查是否已设置昵称
    if (!auth.hasProfile()) {
      wx.showModal({
        title: '提示',
        content: '上传图片前请先设置昵称',
        confirmText: '去设置',
        success: function (res) {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/profile/profile' })
          }
        }
      })
      return
    }

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        var tempFile = res.tempFiles[0]
        var tempFilePath = tempFile.tempFilePath

        // 限制图片大小 5MB
        if (tempFile.size > 5 * 1024 * 1024) {
          wx.showToast({ title: '图片不能超过5MB', icon: 'none' })
          return
        }

        that.setData({ imageUploading: true })

        var cloudPath = 'dishes/' + Date.now() + '-' + Math.random().toString(36).substr(2, 8) + '.jpg'
        var uploadedFileID = ''
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: tempFilePath
        }).then(function (uploadRes) {
          uploadedFileID = uploadRes.fileID
          return cloudUtil.callCloud('uploadDishImage', {
            dishId: that.data.dishId,
            imageFileId: uploadedFileID
          })
        }).then(function () {
          cache.markDirty(['dishes', 'ratings'])
          wx.showToast({ title: '上传成功', icon: 'success' })
          that.loadData()
        }).catch(function (err) {
          console.error('uploadImage error:', err)
          // 清理已上传但未关联的云存储文件
          if (uploadedFileID) {
            wx.cloud.deleteFile({ fileList: [uploadedFileID] })
          }
          wx.showToast({ title: err.message || '上传失败', icon: 'none' })
        }).then(function () {
          that.setData({ imageUploading: false })
        })
      }
    })
  },

  onSubmit: function () {
    var that = this
    if (that.data.submitting) return
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
      cache.markDirty(['dishes', 'ratings'])
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
