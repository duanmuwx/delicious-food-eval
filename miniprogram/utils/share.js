function generateShareTitle(mealName, dishNames) {
  var title = '今日' + mealName + ' | '
  if (dishNames.length > 0) {
    title += dishNames.slice(0, 3).join('、')
    if (dishNames.length > 3) title += '等' + dishNames.length + '道'
  } else {
    title += '快来看看吧'
  }
  return title
}

function getFirstImageUrl(dishes) {
  for (var i = 0; i < dishes.length; i++) {
    if (dishes[i].imageFileId) return dishes[i].imageFileId
  }
  return '/images/default-dish.png'
}

module.exports = {
  generateShareTitle: generateShareTitle,
  getFirstImageUrl: getFirstImageUrl
}
