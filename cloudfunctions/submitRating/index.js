const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { dishId, score, comment, date } = event

  if (!dishId || !score || score < 1 || score > 5 || !date) {
    return { code: -1, message: '参数错误' }
  }

  try {
    // 查询用户当天是否已评分
    const existingRes = await db.collection('ratings').where({
      dishId: dishId,
      userId: openid,
      date: date
    }).get()

    const existing = existingRes.data.length > 0 ? existingRes.data[0] : null

    if (existing) {
      // 修改评分：更新 rating 记录
      const oldScore = existing.score
      const scoreDiff = score - oldScore

      await db.collection('ratings').doc(existing._id).update({
        data: {
          score: score,
          comment: comment || '',
          updatedAt: db.serverDate()
        }
      })

      // 用差值调整 avgScore：newAvg = oldAvg + (scoreDiff / ratingCount)
      // 先获取当前 dish 数据来计算
      const dishRes = await db.collection('dishes').doc(dishId).get()
      const dish = dishRes.data
      const newAvgScore = dish.ratingCount > 0
        ? (dish.avgScore * dish.ratingCount + scoreDiff) / dish.ratingCount
        : score

      await db.collection('dishes').doc(dishId).update({
        data: {
          avgScore: Math.round(newAvgScore * 10) / 10
        }
      })
    } else {
      // 新评分：创建 rating 记录
      await db.collection('ratings').add({
        data: {
          dishId: dishId,
          userId: openid,
          score: score,
          comment: comment || '',
          date: date,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
      })

      // 更新 dishes 的 avgScore 和 ratingCount
      const dishRes = await db.collection('dishes').doc(dishId).get()
      const dish = dishRes.data
      const newCount = (dish.ratingCount || 0) + 1
      const newAvgScore = ((dish.avgScore || 0) * (dish.ratingCount || 0) + score) / newCount

      await db.collection('dishes').doc(dishId).update({
        data: {
          avgScore: Math.round(newAvgScore * 10) / 10,
          ratingCount: newCount
        }
      })
    }

    return { code: 0, message: '评分成功' }
  } catch (err) {
    console.error('submitRating error:', err)
    return { code: -1, message: '评分失败' }
  }
}
