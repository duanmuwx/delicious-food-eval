const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { dishId, dishIds } = event

  // 支持单个 dishId 或多个 dishIds
  var ids = dishIds && dishIds.length > 0 ? dishIds : (dishId ? [dishId] : [])
  if (ids.length === 0) {
    return { code: -1, message: '参数错误' }
  }

  try {
    // 获取菜品信息
    var dishes = []
    for (var d = 0; d < ids.length; d += 500) {
      var batch = ids.slice(d, d + 500)
      var dishRes = await db.collection('dishes').where({
        _id: _.in(batch)
      }).get()
      dishes = dishes.concat(dishRes.data)
    }

    if (dishes.length === 0) {
      return { code: -1, message: '菜品不存在' }
    }

    // 汇总菜品信息
    var dishName = dishes[0].name
    var imageFileId = ''
    var totalScore = 0
    var totalCount = 0
    dishes.forEach(function (dd) {
      if (!imageFileId && dd.imageFileId) imageFileId = dd.imageFileId
      totalScore += (dd.avgScore || 0) * (dd.ratingCount || 0)
      totalCount += dd.ratingCount || 0
    })
    var avgScore = totalCount > 0 ? Math.round((totalScore / totalCount) * 10) / 10 : 0

    // 分页获取所有 dishId 的评分记录
    var allRatings = []
    var batchSize = 100
    for (var di = 0; di < ids.length; di++) {
      var offset = 0
      while (true) {
        var res = await db.collection('ratings').where({
          dishId: ids[di]
        }).orderBy('createdAt', 'desc').skip(offset).limit(batchSize).get()
        allRatings = allRatings.concat(res.data)
        offset += res.data.length
        if (res.data.length < batchSize) break
      }
    }

    // 按时间降序排列所有评论
    allRatings.sort(function (a, b) {
      if (a.createdAt > b.createdAt) return -1
      if (a.createdAt < b.createdAt) return 1
      return 0
    })

    // 收集所有 userId，批量查询用户资料
    var userIds = []
    allRatings.forEach(function (r) {
      if (userIds.indexOf(r.userId) === -1) {
        userIds.push(r.userId)
      }
    })

    var userMap = {}
    for (var i = 0; i < userIds.length; i += 500) {
      var ubatch = userIds.slice(i, i + 500)
      var userRes = await db.collection('users').where({
        userId: _.in(ubatch)
      }).get()
      userRes.data.forEach(function (u) {
        userMap[u.userId] = u
      })
    }

    // 组装评论列表
    var comments = allRatings.map(function (r) {
      var user = userMap[r.userId] || {}
      return {
        _id: r._id,
        score: r.score,
        comment: r.comment || '',
        date: r.date,
        createdAt: r.createdAt,
        nickName: r.nickName || user.nickName || '',
        avatarUrl: r.avatarUrl || user.avatarUrl || ''
      }
    })

    return {
      code: 0,
      dish: {
        _id: ids[0],
        name: dishName,
        imageFileId: imageFileId,
        avgScore: avgScore,
        ratingCount: totalCount
      },
      comments: comments
    }
  } catch (err) {
    console.error('getDishRatings error:', err)
    return { code: -1, message: '获取评论失败' }
  }
}
