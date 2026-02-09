const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { dishId } = event

  // 校验管理员身份
  try {
    const adminRes = await db.collection('admins').where({
      userId: openid
    }).get()

    if (adminRes.data.length === 0) {
      return { code: -1, message: '无管理员权限' }
    }
  } catch (err) {
    return { code: -1, message: '权限校验失败' }
  }

  if (!dishId) {
    return { code: -1, message: '参数不完整' }
  }

  try {
    // 获取菜品信息（用于删除云存储图片）
    const dishRes = await db.collection('dishes').doc(dishId).get()
    const dish = dishRes.data

    // 删除关联的评分记录
    // 云数据库单次删除有条数限制，需要循环删除
    let deleteCount = 0
    do {
      const delRes = await db.collection('ratings').where({
        dishId: dishId
      }).limit(100).remove()
      deleteCount = delRes.stats.removed
    } while (deleteCount > 0)

    // 删除云存储图片
    if (dish.imageFileId) {
      try {
        await cloud.deleteFile({
          fileList: [dish.imageFileId]
        })
      } catch (e) {
        console.warn('删除图片失败:', e)
      }
    }

    // 删除菜品记录
    await db.collection('dishes').doc(dishId).remove()

    return { code: 0, message: '删除成功' }
  } catch (err) {
    console.error('deleteDish error:', err)
    return { code: -1, message: '删除失败' }
  }
}
