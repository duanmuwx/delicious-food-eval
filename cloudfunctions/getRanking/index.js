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

// 分页获取所有符合条件的菜品（单次上限100条）
async function getAllDishes(where) {
  var all = []
  var batchSize = 100
  while (true) {
    var res = await db.collection('dishes')
      .where(where)
      .skip(all.length)
      .limit(batchSize)
      .get()
    all = all.concat(res.data)
    if (res.data.length < batchSize) break
  }
  return all
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

    // 查询日期范围内、有评分的所有菜品
    var dishes = await getAllDishes({
      date: _.gte(range.start).and(_.lte(range.end)),
      ratingCount: _.gt(0)
    })

    // 按菜名聚合：加权平均分，累计人数，收集所有dishId
    var grouped = {}
    dishes.forEach(function (d) {
      var key = d.name
      if (!grouped[key]) {
        grouped[key] = {
          name: d.name,
          imageFileId: d.imageFileId || '',
          totalScore: 0,
          totalCount: 0,
          appearCount: 0,
          dishIds: []
        }
      }
      var g = grouped[key]
      g.totalScore += (d.avgScore || 0) * (d.ratingCount || 0)
      g.totalCount += d.ratingCount || 0
      g.appearCount += 1
      g.dishIds.push(d._id)
      // 优先使用有图片的记录
      if (!g.imageFileId && d.imageFileId) {
        g.imageFileId = d.imageFileId
      }
    })

    // 计算加权平均分并排序
    var rankList = Object.values(grouped).map(function (g) {
      var avg = g.totalCount > 0 ? Math.round((g.totalScore / g.totalCount) * 10) / 10 : 0
      return {
        name: g.name,
        imageFileId: g.imageFileId,
        avgScore: avg,
        ratingCount: g.totalCount,
        appearCount: g.appearCount,
        dishIds: g.dishIds
      }
    })

    rankList.sort(function (a, b) {
      if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore
      return b.ratingCount - a.ratingCount
    })

    return {
      code: 0,
      data: rankList.slice(0, 10)
    }
  } catch (err) {
    console.error('getRanking error:', err)
    return { code: -1, message: '获取排行榜失败' }
  }
}
