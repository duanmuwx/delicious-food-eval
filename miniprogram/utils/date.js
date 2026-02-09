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

module.exports = {
  getToday: getToday,
  formatDate: formatDate,
  getWeekRange: getWeekRange,
  getMonthRange: getMonthRange,
  formatDateChinese: formatDateChinese
}
