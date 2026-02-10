const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { dishId } = event

  if (!dishId) {
    return { code: -1, message: '参数错误' }
  }

  try {
    // 获取菜品信息
    const dishRes = await db.collection('dishes').doc(dishId).get()
    const dish = dishRes.data

    // 分页获取该菜品所有评分记录
    var allRatings = []
    var batchSize = 100
    while (true) {
      var res = await db.collection('ratings').where({
        dishId: dishId
      }).orderBy('createdAt', 'desc').skip(allRatings.length).limit(batchSize).get()
      allRatings = allRatings.concat(res.data)
      if (res.data.length < batchSize) break
    }

    // 收集所有 userId，批量查询用户资料
    var userIds = []
    allRatings.forEach(function (r) {
      if (userIds.indexOf(r.userId) === -1) {
        userIds.push(r.userId)
      }
    })

    var userMap = {}
    // 云数据库 in 查询上限 500，分批查询
    for (var i = 0; i < userIds.length; i += 500) {
      var batch = userIds.slice(i, i + 500)
      var userRes = await db.collection('users').where({
        userId: _.in(batch)
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
        _id: dish._id,
        name: dish.name,
        imageFileId: dish.imageFileId || '',
        avgScore: dish.avgScore || 0,
        ratingCount: dish.ratingCount || 0
      },
      comments: comments
    }
  } catch (err) {
    console.error('getDishRatings error:', err)
    return { code: -1, message: '获取评论失败' }
  }
}
