const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

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
  // 获取该菜品所有评分（每个用户每天只保留一条）
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
  const { dishId, score, comment, date } = event

  if (!dishId || !score || score < 0.5 || score > 5 || score % 0.5 !== 0 || !date) {
    return { code: -1, message: '参数错误' }
  }

  try {
    // 获取用户资料（昵称、头像）用于冗余存储
    var nickName = ''
    var avatarUrl = ''
    try {
      const userRes = await db.collection('users').where({
        userId: openid
      }).get()
      if (userRes.data.length > 0) {
        nickName = userRes.data[0].nickName || ''
        avatarUrl = userRes.data[0].avatarUrl || ''
      }
    } catch (e) {
      // 获取用户资料失败不影响评分
    }

    // 查询用户当天是否已评分
    const existingRes = await db.collection('ratings').where({
      dishId: dishId,
      userId: openid,
      date: date
    }).get()

    const existingList = existingRes.data

    if (existingList.length > 0) {
      // 已有评分记录 — 更新第一条，删除多余的重复记录
      const keep = existingList[0]

      await db.collection('ratings').doc(keep._id).update({
        data: {
          score: score,
          comment: comment || '',
          nickName: nickName,
          avatarUrl: avatarUrl,
          updatedAt: db.serverDate()
        }
      })

      // 清理重复记录（竞态条件可能产生的）
      for (var i = 1; i < existingList.length; i++) {
        await db.collection('ratings').doc(existingList[i]._id).remove()
      }
    } else {
      // 新评分：创建记录
      await db.collection('ratings').add({
        data: {
          dishId: dishId,
          userId: openid,
          score: score,
          comment: comment || '',
          nickName: nickName,
          avatarUrl: avatarUrl,
          date: date,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
      })

      // 创建后再查一次，清理可能的并发重复
      const checkRes = await db.collection('ratings').where({
        dishId: dishId,
        userId: openid,
        date: date
      }).orderBy('createdAt', 'asc').get()

      if (checkRes.data.length > 1) {
        // 保留第一条，删除其余
        for (var j = 1; j < checkRes.data.length; j++) {
          await db.collection('ratings').doc(checkRes.data[j]._id).remove()
        }
      }
    }

    // 始终从 ratings 集合重新计算，避免增量计算的累积误差
    await recalcDishScore(dishId)

    return { code: 0, message: '评分成功' }
  } catch (err) {
    console.error('submitRating error:', err)
    return { code: -1, message: '评分失败' }
  }
}
