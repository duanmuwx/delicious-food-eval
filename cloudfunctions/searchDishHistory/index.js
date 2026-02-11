const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { meal, keyword } = event

  // 校验管理员身份
  const adminRes = await db.collection('admins').where({ userId: openid }).get()
  if (adminRes.data.length === 0) {
    return { code: -1, message: '无管理员权限' }
  }

  if (!meal) {
    return { code: -1, message: '请指定餐次' }
  }

  // 构建查询条件
  var where = { meal: meal }
  if (keyword) {
    where.name = db.RegExp({ regexp: keyword, options: 'i' })
  }

  // 分批查询，按日期降序
  var allDishes = []
  var batchSize = 100
  var skip = 0
  while (true) {
    var res = await db.collection('dishes')
      .where(where)
      .orderBy('date', 'desc')
      .skip(skip)
      .limit(batchSize)
      .get()
    allDishes = allDishes.concat(res.data)
    if (res.data.length < batchSize) break
    skip += batchSize
  }

  // 按菜名去重，保留最近一条
  var seen = {}
  var unique = []
  allDishes.forEach(function (d) {
    if (!seen[d.name]) {
      seen[d.name] = true
      unique.push({
        name: d.name,
        meal: d.meal,
        lastImageFileId: d.imageFileId || '',
        lastDate: d.date
      })
    }
  })

  return { code: 0, data: unique }
}
