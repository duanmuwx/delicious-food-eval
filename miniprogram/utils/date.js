function getToday() {
  return formatDate(new Date())
}

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

function formatDateChinese(dateStr) {
  var parts = dateStr.split('-')
  return parseInt(parts[1]) + '月' + parseInt(parts[2]) + '日'
}

function getWeekRangeByOffset(offset) {
  var now = new Date()
  var dayOfWeek = now.getDay() || 7
  var monday = new Date(now)
  monday.setDate(now.getDate() - dayOfWeek + 1 + (offset * 7))
  var dates = []
  for (var i = 0; i < 7; i++) {
    var d = new Date(monday)
    d.setDate(monday.getDate() + i)
    dates.push(formatDate(d))
  }
  return { start: dates[0], end: dates[6], dates: dates }
}

function getDayOfWeekLabel(dateStr) {
  var labels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  var d = new Date(dateStr.replace(/-/g, '/'))
  return labels[d.getDay()]
}

module.exports = {
  getToday: getToday,
  formatDate: formatDate,
  getWeekRange: getWeekRange,
  getMonthRange: getMonthRange,
  formatDateChinese: formatDateChinese,
  getWeekRangeByOffset: getWeekRangeByOffset,
  getDayOfWeekLabel: getDayOfWeekLabel
}
