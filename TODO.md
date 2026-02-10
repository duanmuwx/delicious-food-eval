# TODO - 待办功能

## 评论互动功能
- [ ] 评论点赞功能：用户可以对其他用户的评论点赞
- [ ] 评论回复功能：用户可以回复其他用户的评论

## 数据库变更（评论互动所需）
- [ ] 新建 `comment_likes` 集合：`commentId`, `userId`, `createdAt`
- [ ] 新建 `comment_replies` 集合：`commentId`, `userId`, `content`, `createdAt`
- [ ] 新建对应的云函数：`likeComment`, `replyComment`, `getCommentReplies`
