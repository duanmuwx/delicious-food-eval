const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { dishId, imageFileId, description, oldImageFileId } = event

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
    const updateData = {}

    if (imageFileId !== undefined) {
      updateData.imageFileId = imageFileId
      // 图片变更时清空用户贡献者信息
      updateData.imageContributor = ''
      updateData.imageContributorName = ''
      // 删除旧图片
      if (oldImageFileId) {
        try {
          await cloud.deleteFile({ fileList: [oldImageFileId] })
        } catch (e) {
          console.warn('删除旧图片失败:', e)
        }
      }
    }

    if (description !== undefined) {
      updateData.description = description
    }

    if (Object.keys(updateData).length === 0) {
      return { code: -1, message: '无更新内容' }
    }

    await db.collection('dishes').doc(dishId).update({
      data: updateData
    })

    return { code: 0, message: '更新成功' }
  } catch (err) {
    console.error('updateDish error:', err)
    return { code: -1, message: '更新失败' }
  }
}
