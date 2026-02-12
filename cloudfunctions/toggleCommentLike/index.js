const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { ratingId } = event

  if (!ratingId) {
    return { code: -1, message: '参数错误' }
  }

  try {
    // 查询该评论是否存在
    const ratingRes = await db.collection('ratings').doc(ratingId).get()
    const rating = ratingRes.data

    // 不能给自己的评论点赞
    if (rating.userId === openid) {
      return { code: -1, message: '不能给自己的评论点赞' }
    }

    const likedBy = rating.likedBy || []
    const alreadyLiked = likedBy.indexOf(openid) !== -1

    if (alreadyLiked) {
      // 取消点赞
      await db.collection('ratings').doc(ratingId).update({
        data: {
          likedBy: _.pull(openid),
          likeCount: _.inc(-1)
        }
      })
      return { code: 0, liked: false, likeCount: (rating.likeCount || 1) - 1 }
    } else {
      // 点赞
      await db.collection('ratings').doc(ratingId).update({
        data: {
          likedBy: _.addToSet(openid),
          likeCount: _.inc(1)
        }
      })
      return { code: 0, liked: true, likeCount: (rating.likeCount || 0) + 1 }
    }
  } catch (err) {
    console.error('toggleCommentLike error:', err)
    return { code: -1, message: '操作失败' }
  }
}
