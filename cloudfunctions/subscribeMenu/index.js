const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 模板 ID，需要在微信公众平台订阅消息中获取并替换
const TEMPLATE_ID = 'YOUR_TEMPLATE_ID'

var MEAL_LABELS = { lunch: '午餐', dinner: '晚餐' }
var DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

// 记录用户订阅（按餐次累加额度）
async function subscribe(openid, meal) {
  var field = meal + 'Count'
  var res = await db.collection('subscriptions').where({ userId: openid }).get()
  if (res.data.length > 0) {
    var update = { updatedAt: db.serverDate() }
    update[field] = _.inc(1)
    await db.collection('subscriptions').doc(res.data[0]._id).update({ data: update })
  } else {
    var data = {
      userId: openid,
      lunchCount: 0,
      dinnerCount: 0,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate()
    }
    data[field] = 1
    await db.collection('subscriptions').add({ data: data })
  }
  return { code: 0, message: '订阅成功' }
}

// 根据餐次批量发送订阅消息
async function sendAll(meal) {
  var mealLabel = MEAL_LABELS[meal]
  // 获取今日日期 (UTC+8)
  var now = new Date()
  now.setHours(now.getHours() + 8)
  var today = now.toISOString().slice(0, 10)

  var { data: dishes } = await db.collection('dishes')
    .where({ date: today, meal: meal })
    .orderBy('avgScore', 'desc')
    .get()

  if (dishes.length === 0) {
    console.log('今日无' + mealLabel + '菜品，跳过推送')
    return { code: 0, message: '今日无' + mealLabel + '菜品' }
  }

  var names = dishes.slice(0, 3).map(function (d) { return d.name })
  var summary = names.join('、') + (dishes.length > 3 ? '等' + dishes.length + '道菜' : '')

  // 计算好评率（>=4分为好评）
  var goodCount = dishes.filter(function (d) { return d.avgScore >= 4 }).length
  var goodRate = Math.round(goodCount / dishes.length * 100)
  var evaluation = '今日好评率' + goodRate + '% '
  if (goodRate >= 80) {
    evaluation += '值得期待'
  } else if (goodRate >= 50) {
    evaluation += '看看再说'
  } else {
    evaluation += '将就一下'
  }

  // 友好日期格式：X月X日 周X 午餐/晚餐
  var parts = today.split('-')
  var dayOfWeek = DAY_NAMES[now.getDay()]
  var timeStr = parseInt(parts[1]) + '月' + parseInt(parts[2]) + '日 ' + dayOfWeek + ' ' + mealLabel

  // 分页获取所有有额度的订阅用户
  var countField = meal + 'Count'
  var where = {}
  where[countField] = _.gt(0)
  var allSubs = []
  while (true) {
    var batch = await db.collection('subscriptions')
      .where(where)
      .skip(allSubs.length)
      .limit(100)
      .get()
    allSubs = allSubs.concat(batch.data)
    if (batch.data.length < 100) break
  }

  var sentCount = 0
  for (var i = 0; i < allSubs.length; i++) {
    var sub = allSubs[i]
    try {
      await cloud.openapi.subscribeMessage.send({
        touser: sub.userId,
        templateId: TEMPLATE_ID,
        page: 'pages/home/home',
        data: {
          thing1: { value: summary.slice(0, 20) },
          thing2: { value: evaluation.slice(0, 20) },
          time3: { value: timeStr.slice(0, 20) }
        }
      })
      sentCount++
    } catch (e) {
      console.error('发送失败 userId:', sub.userId, e)
    }
    var dec = {}
    dec[countField] = _.inc(-1)
    await db.collection('subscriptions').doc(sub._id).update({ data: dec })
  }

  console.log(mealLabel + '推送完成，共发送', sentCount, '/', allSubs.length)
  return { code: 0, message: '已发送 ' + sentCount + ' 条' }
}

exports.main = async (event, context) => {
  // 定时触发器调用：根据当前小时判断餐次
  if (event.Type === 'Timer') {
    var hour = new Date(new Date().getTime() + 8 * 3600000).getHours()
    var meal = hour < 15 ? 'lunch' : 'dinner'
    return await sendAll(meal)
  }

  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action } = event

  if (action === 'subscribe') {
    try {
      var m = event.meal
      if (m !== 'lunch' && m !== 'dinner') return { code: -1, message: '参数错误' }
      return await subscribe(openid, m)
    } catch (err) {
      console.error('subscribe error:', err)
      return { code: -1, message: '订阅失败' }
    }
  }

  return { code: -1, message: '未知操作' }
}
