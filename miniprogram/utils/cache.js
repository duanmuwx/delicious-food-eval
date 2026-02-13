// 轻量缓存：TTL + 脏标记
var DEFAULT_TTL = 30 * 1000 // 30秒

var _dirty = {}

module.exports = {
  // 标记某个域为脏（下次 onShow 必须刷新）
  markDirty: function (keys) {
    for (var i = 0; i < keys.length; i++) {
      _dirty[keys[i]] = true
    }
  },

  // 判断页面是否需要刷新：脏标记 或 超过 TTL
  needRefresh: function (pageInstance, key, ttl) {
    if (_dirty[key]) {
      delete _dirty[key]
      return true
    }
    var now = Date.now()
    var last = pageInstance._cacheTime || 0
    if (now - last > (ttl || DEFAULT_TTL)) {
      return true
    }
    return false
  },

  // 页面加载完成后调用，记录时间戳
  stamp: function (pageInstance) {
    pageInstance._cacheTime = Date.now()
  }
}
