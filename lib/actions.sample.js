const alis = require("alis")
module.exports["2APJkQqzNbeb"] = async notification => {
  try {
    // 投げ銭ユーザーの最新の記事を取得
    const res = await alis.p.users.user_id.articles.public({
      limit: 1,
      user_id: notification.acted_user_id
    })

    if (typeof res.Items === "undefined" || res.Items.length == 0) {
      // 記事がない場合はスキップ
      return false
    } else {
      // お礼のコメントを投稿
      const article_id = res.Items[0].article_id
      const text = `${
        notification.tip_value_normalized
      } ALISの投げ銭ありがとうございました！`
      const comment_result = await alis.p.me.articles.article_id.comments(
        { comment: { text: text }, article_id: article_id },
        {
          method: "POST",
          username: process.env.ALIS_USERNAME,
          password: process.env.ALIS_PASSWORD
        }
      )
      if (typeof comment_result.comment_id === "string") {
        // 処理成功フラグをリターン
        return true
      } else {
        // なんらかのエラーが起きた場合はスキップ
        return false
      }
    }
  } catch (e) {
    // なんらかのエラーが起きた場合はスキップ
    return false
  }
}
