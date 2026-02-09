const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    const adminRes = await db.collection('admins').where({
      userId: openid
    }).get()

    const isAdmin = adminRes.data.length > 0

    return {
      code: 0,
      openid: openid,
      isAdmin: isAdmin
    }
  } catch (err) {
    console.error('login error:', err)
    return {
      code: 0,
      openid: openid,
      isAdmin: false
    }
  }
}
