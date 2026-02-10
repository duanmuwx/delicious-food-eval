var auth = require('../../utils/auth')
var cloudUtil = require('../../utils/cloud')

Page({
  data: {
    mode: 'wechat',
    nickName: '',
    avatarUrl: '',
    customNickName: '',
    saving: false
  },

  onLoad: function () {
    var profile = auth.getProfile()
    this.setData({
      nickName: profile.nickName,
      avatarUrl: profile.avatarUrl
    })
  },

  onChooseAvatar: function (e) {
    var that = this
    var tempUrl = e.detail.avatarUrl
    // 上传头像到云存储
    var cloudPath = 'avatars/' + Date.now() + '-' + Math.random().toString(36).substring(2, 8) + '.png'
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: tempUrl,
      success: function (res) {
        that.setData({ avatarUrl: res.fileID })
      },
      fail: function (err) {
        console.error('upload avatar error:', err)
        wx.showToast({ title: '头像上传失败', icon: 'none' })
      }
    })
  },

  onNickNameInput: function (e) {
    this.setData({ nickName: e.detail.value })
  },

  onCustomNickNameInput: function (e) {
    this.setData({ customNickName: e.detail.value })
  },

  switchMode: function (e) {
    var mode = e.currentTarget.dataset.mode
    this.setData({ mode: mode })
  },

  onSave: function () {
    var that = this
    var finalNickName = ''

    if (that.data.mode === 'wechat') {
      finalNickName = that.data.nickName
    } else {
      finalNickName = that.data.customNickName
    }

    if (!finalNickName || !finalNickName.trim()) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }

    that.setData({ saving: true })
    cloudUtil.callCloud('updateProfile', {
      nickName: finalNickName.trim(),
      avatarUrl: that.data.avatarUrl
    }).then(function (res) {
      auth.updateLocalProfile(res.nickName, res.avatarUrl)
      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(function () {
        wx.navigateBack()
      }, 1500)
    }).catch(function (err) {
      console.error('save profile error:', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    }).then(function () {
      that.setData({ saving: false })
    })
  }
})
