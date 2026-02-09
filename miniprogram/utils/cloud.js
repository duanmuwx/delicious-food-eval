function callCloud(name, data) {
  data = data || {}
  return wx.cloud.callFunction({
    name: name,
    data: data
  }).then(function (res) {
    if (res.result && res.result.code === 0) {
      return res.result
    } else {
      var errMsg = (res.result && res.result.message) || '操作失败'
      return Promise.reject(new Error(errMsg))
    }
  }).catch(function (err) {
    console.error('Cloud function [' + name + '] error:', err)
    wx.showToast({ title: '网络异常，请重试', icon: 'none' })
    return Promise.reject(err)
  })
}

module.exports = {
  callCloud: callCloud
}
