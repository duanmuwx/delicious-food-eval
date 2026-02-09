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

  if (meal !== 'lunch' && meal !== 'dinner') {
    return { code: -1, message: '餐次参数错误' }
  }

  try {
    await db.collection('dishes').add({
      data: {
        name: name.trim(),
        meal: meal,
        date: date,
        imageFileId: imageFileId || '',
        description: description || '',
        avgScore: 0,
        ratingCount: 0,
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
