const alis = require("alis")
module.exports["3Qjr7Y5DxwEN"] = async notification => {
  try {
    // 投げ銭ユーザーの最新の記事を取得
    let res = await alis.p.users.user_id.articles.public({
      limit: 1,
      user_id: notification.acted_user_id
    })

    if (typeof res.Items === "undefined" || res.Items.length == 0) {
      // 記事がない場合はスキップ
      return false
    } else {
      // お礼のコメントを投稿
      let article_id = res.Items[0].article_id
      let text = `${
        notification.tip_value_normalized
      } ALISの投げ銭ありがとうございました！`
      let comment_result = await alis.p.me.articles.article_id.comments(
        { comment: { text: text }, article_id: "2xANm0jEzLPB" },
        {
          method: "POST",
          username: process.env.ALIS_USERNAME,
          password: process.env.ALIS_PASSWORD
        }
      )

      // 処理成功フラグをリターン
      return true
    }
  } catch (e) {
    // なんらかのエラーが起きた場合はスキップ
    return false
  }
}
