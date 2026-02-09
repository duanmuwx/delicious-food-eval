const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

function formatDate(d) {
  var year = d.getFullYear()
  var month = String(d.getMonth() + 1).padStart(2, '0')
  var day = String(d.getDate()).padStart(2, '0')
  return year + '-' + month + '-' + day
}

function getWeekRange() {
  var now = new Date()
  var dayOfWeek = now.getDay() || 7
  var monday = new Date(now)
  monday.setDate(now.getDate() - dayOfWeek + 1)
  var sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { start: formatDate(monday), end: formatDate(sunday) }
}

function getMonthRange() {
  var now = new Date()
  var start = new Date(now.getFullYear(), now.getMonth(), 1)
  var end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { start: formatDate(start), end: formatDate(end) }
}

exports.main = async (event, context) => {
  const { type } = event

  try {
    var range
    if (type === 'month') {
      range = getMonthRange()
    } else {
      range = getWeekRange()
    }

    // 查询日期范围内、有评分的菜品，按平均分降序，取前10
    const res = await db.collection('dishes')
      .where({
        date: _.gte(range.start).and(_.lte(range.end)),
        ratingCount: _.gt(0)
      })
      .orderBy('avgScore', 'desc')
      .orderBy('ratingCount', 'desc')
      .limit(10)
      .get()

    return {
      code: 0,
      data: res.data
    }
  } catch (err) {
    console.error('getRanking error:', err)
    return { code: -1, message: '获取排行榜失败' }
  }
}
