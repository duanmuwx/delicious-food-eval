const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { name, meal, date, imageFileId, description } = event

  // 校验管理员身份
  try {
    const adminRes = await db.collection('admins').where({
      userId: openid
    }).get()

    if (adminRes.data.length === 0) {
      return { code: -1, message: '无管理员权限' }
    }
  } catch (err) {
    return { code: -1, message: '权限校验失败' }
  }

  // 参数校验
  if (!name || !meal || !date) {
    return { code: -1, message: '参数不完整' }
  }

  if (meal !== 'breakfast' && meal !== 'lunch' && meal !== 'dinner') {
    return { code: -1, message: '餐次参数错误' }
  }

  try {
    // 查历史同名菜品的加权均分，判断是否为高分菜品
    const trimmedName = name.trim()
    let isHighScore = false
    const historyRes = await db.collection('dishes')
      .where({ name: trimmedName, ratingCount: db.command.gt(0) })
      .field({ avgScore: true, ratingCount: true })
      .limit(100)
      .get()
    if (historyRes.data.length > 0) {
      let totalScore = 0, totalCount = 0
      historyRes.data.forEach(d => {
        totalScore += d.avgScore * d.ratingCount
        totalCount += d.ratingCount
      })
      isHighScore = totalCount > 0 && (totalScore / totalCount) >= 4.5
    }

    await db.collection('dishes').add({
      data: {
        name: trimmedName,
        meal: meal,
        date: date,
        imageFileId: imageFileId || '',
        description: description || '',
        avgScore: 0,
        ratingCount: 0,
        isHighScore: isHighScore,
        createdBy: openid,
        createdAt: db.serverDate()
      }
    })

    return { code: 0, message: '添加成功' }
  } catch (err) {
    console.error('addDish error:', err)
    return { code: -1, message: '添加失败' }
  }
}
