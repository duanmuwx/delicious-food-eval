const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { dishes } = event

  // 校验管理员身份
  const adminRes = await db.collection('admins').where({ userId: openid }).get()
  if (adminRes.data.length === 0) {
    return { code: -1, message: '无管理员权限' }
  }

  if (!dishes || !dishes.length) {
    return { code: -1, message: '请选择要添加的菜品' }
  }

  var added = 0
  for (var i = 0; i < dishes.length; i++) {
    var d = dishes[i]
    if (!d.name || !d.meal || !d.date) continue
    var trimmedName = d.name.trim()

    // 查历史同名菜品的加权均分，判断是否为高分菜品
    var isHighScore = false
    var historyRes = await db.collection('dishes')
      .where({ name: trimmedName, ratingCount: db.command.gt(0) })
      .field({ avgScore: true, ratingCount: true })
      .limit(100)
      .get()
    if (historyRes.data.length > 0) {
      var totalScore = 0, totalCount = 0
      historyRes.data.forEach(function (h) {
        totalScore += h.avgScore * h.ratingCount
        totalCount += h.ratingCount
      })
      isHighScore = totalCount > 0 && (totalScore / totalCount) >= 4.5
    }

    await db.collection('dishes').add({
      data: {
        name: trimmedName,
        meal: d.meal,
        date: d.date,
        imageFileId: d.imageFileId || '',
        description: '',
        avgScore: 0,
        ratingCount: 0,
        isHighScore: isHighScore,
        createdBy: openid,
        createdAt: db.serverDate()
      }
    })
    added++
  }

  return { code: 0, message: '批量添加成功', added: added }
}
