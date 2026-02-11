const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { dishId, imageFileId } = event

  if (!dishId || !imageFileId) {
    return { code: -1, message: '参数不完整' }
  }

  try {
    // 获取用户昵称
    const userRes = await db.collection('users').where({
      userId: openid
    }).get()

    if (userRes.data.length === 0 || !userRes.data[0].nickName || !userRes.data[0].nickName.trim()) {
      return { code: -1, message: '请先设置昵称' }
    }

    const nickName = userRes.data[0].nickName

    // 使用条件更新避免并发覆盖：仅当 imageFileId 为空时才写入
    const _ = db.command
    const updateRes = await db.collection('dishes').where({
      _id: dishId,
      imageFileId: _.or(_.eq(''), _.exists(false))
    }).update({
      data: {
        imageFileId: imageFileId,
        imageContributor: openid,
        imageContributorName: nickName
      }
    })

    if (updateRes.stats.updated === 0) {
      return { code: -1, message: '该菜品已有图片' }
    }

    return { code: 0, message: '上传成功' }
  } catch (err) {
    console.error('uploadDishImage error:', err)
    return { code: -1, message: '上传失败' }
  }
}
