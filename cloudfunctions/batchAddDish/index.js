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
    await db.collection('dishes').add({
      data: {
        name: d.name.trim(),
        meal: d.meal,
        date: d.date,
        imageFileId: d.imageFileId || '',
        description: '',
        avgScore: 0,
        ratingCount: 0,
        createdBy: openid,
        createdAt: db.serverDate()
      }
    })
    added++
  }

  return { code: 0, message: '批量添加成功', added: added }
}
