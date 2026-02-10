const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 分页获取集合中符合条件的全部记录（云数据库单次 get 上限 100 条）
async function getAllRatings(dishId) {
  var all = []
  var batchSize = 100
  while (true) {
    var res = await db.collection('ratings').where({
      dishId: dishId
    }).skip(all.length).limit(batchSize).get()
    all = all.concat(res.data)
    if (res.data.length < batchSize) break
  }
  return all
}

// 根据 ratings 集合重新计算菜品的 avgScore 和 ratingCount
async function recalcDishScore(dishId) {
  const ratings = await getAllRatings(dishId)
  if (ratings.length === 0) {
    await db.collection('dishes').doc(dishId).update({
      data: { avgScore: 0, ratingCount: 0 }
    })
    return
  }

  // 按 userId+date 去重，保留最新的一条
  var unique = {}
  ratings.forEach(function (r) {
    var key = r.userId + '_' + r.date
    if (!unique[key] || r.updatedAt > unique[key].updatedAt) {
      unique[key] = r
    }
  })

  var validRatings = Object.values(unique)
  var totalScore = 0
  validRatings.forEach(function (r) {
    totalScore += r.score
  })

  var count = validRatings.length
  var avg = Math.round((totalScore / count) * 10) / 10

  await db.collection('dishes').doc(dishId).update({
    data: { avgScore: avg, ratingCount: count }
  })
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { ratingId, dishId } = event

  if (!ratingId || !dishId) {
    return { code: -1, message: '参数不完整' }
  }

  try {
    // 查询该评分记录
    const ratingRes = await db.collection('ratings').doc(ratingId).get()
    const rating = ratingRes.data

    // 判断权限：管理员可删除任意评分，普通用户只能删除自己的
    if (rating.userId !== openid) {
      const adminRes = await db.collection('admins').where({
        userId: openid
      }).get()

      if (adminRes.data.length === 0) {
        return { code: -1, message: '无权删除该评分' }
      }
    }

    // 删除评分记录
    await db.collection('ratings').doc(ratingId).remove()

    // 重算菜品分数
    await recalcDishScore(dishId)

    return { code: 0, message: '删除成功' }
  } catch (err) {
    console.error('deleteRating error:', err)
    return { code: -1, message: '删除失败' }
  }
}
