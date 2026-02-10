const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { nickName, avatarUrl } = event

  if (!nickName) {
    return { code: -1, message: '昵称不能为空' }
  }

  try {
    // 查询是否已有用户资料
    const userRes = await db.collection('users').where({
      userId: openid
    }).get()

    if (userRes.data.length > 0) {
      // 更新已有资料
      await db.collection('users').doc(userRes.data[0]._id).update({
        data: {
          nickName: nickName,
          avatarUrl: avatarUrl || '',
          updatedAt: db.serverDate()
        }
      })
    } else {
      // 创建新资料
      await db.collection('users').add({
        data: {
          userId: openid,
          nickName: nickName,
          avatarUrl: avatarUrl || '',
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
      })
    }

    return {
      code: 0,
      message: '保存成功',
      nickName: nickName,
      avatarUrl: avatarUrl || ''
    }
  } catch (err) {
    console.error('updateProfile error:', err)
    return { code: -1, message: '保存失败' }
  }
}
