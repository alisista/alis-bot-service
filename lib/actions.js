const alis = require("alis")
const twit = require("twit")
const DB = require("monk")(process.env.MONGODB_URL)
const cred = require("./cred")
const db = {
  nise: DB.get("nise")
}

class Helper {
  static async addDeposit(dbname, user_id, num = 1) {
    let deposit = (await db[dbname].findOne({
      user_id: user_id
    })) || { deposit: 0 }
    deposit.deposit += num
    let res = await db.nise.update(
      {
        user_id: user_id
      },
      {
        $set: {
          user_id: user_id,
          deposit: deposit.deposit
        }
      },
      { upsert: true }
    )
    return deposit.deposit
  }
  static async getDeposit(dbname, user_id) {
    let deposit = (await db[dbname].findOne({
      user_id: user_id
    })) || { deposit: 0 }
    return deposit.deposit
  }

  static async postComment(article_id, text, parent_id, replyed_user_id) {
    let options = cred("POST")
    if (
      typeof parent_id !== "undefined" &&
      typeof replyed_user_id !== "undefined"
    ) {
      return await alis.p.me.articles.article_id.comments.reply(
        {
          comment: {
            text: text,
            parent_id: parent_id,
            replyed_user_id: replyed_user_id
          },
          article_id: article_id
        },
        options
      )
    } else {
      return await alis.p.me.articles.article_id.comments(
        { comment: { text: text }, article_id: article_id },
        options
      )
    }
  }
  static async getLatestArticle(user_id) {
    const res = await alis.p.users.user_id.articles.public({
      limit: 1,
      user_id: user_id
    })
    if (typeof res.Items === "undefined" || res.Items.length == 0) {
      return false
    } else {
      return res.Items[0]
    }
  }
  static async postError(article_id, text, comment, acted_user_id, byDeposit) {
    const comment_result = await Helper.postComment(
      article_id,
      text,
      comment.comment_id,
      comment.user_id
    )
    if (byDeposit !== false) {
      let deposit = await Helper.addDeposit("nise", acted_user_id)
    }
  }
  static async postTweet(status) {
    let twitter_credentials = {
      consumer_key: process.env.TWITTER_CONSUMER_KEY_BOT,
      consumer_secret: process.env.TWITTER_CONSUMER_SECRET_BOT,
      access_token: process.env.TWITTER_ACCESS_TOKEN_BOT,
      access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET_BOT,
      timeout_ms: 60 * 1000
    }
    const T = new twit(twitter_credentials)
    let sts = {
      status: status
    }
    return new Promise((res, rej) => {
      T.post("statuses/update", sts, (err, data, response) => {
        if (err != null) {
          rej(err)
        } else {
          console.log(data.id_str)
          res(data)
        }
      })
    })
  }
}

let nise_article_id = "aw5zwpA1nQz8"
module.exports[nise_article_id] = async notification => {
  try {
    let byDeposit = false
    if (notification.tip_value_normalized !== 3) {
      let deposit = await Helper.getDeposit("nise", notification.acted_user_id)
      if (deposit <= 0) {
        return true
      } else {
        byDeposit = true
      }
    }

    let comments = await alis.p.articles.article_id.comments({
      article_id: nise_article_id,
      limit: 100
    })
    let comment = null
    for (let v of comments.Items) {
      if (v.user_id == notification.acted_user_id) {
        let done = false
        for (let v2 of v.replies || []) {
          if (v2.user_id === "ocrybit") {
            done = true
          }
        }
        if (done !== true) {
          comment = v
        }
        break
      }
    }
    if (comment === null) {
      if (byDeposit === false) {
        const article = await Helper.getLatestArticle(
          notification.acted_user_id
        )
        if (article !== false) {
          console.log("no comment found")
          const comment_result = await Helper.postComment(
            article.article_id,
            `ツイート依頼料の3ALISを投げ銭いただきましたが、ツイート用のコメントが見当たりません。ご希望のツイートを１４０文字以内で以下の記事のコメント欄に投稿して下さい。\n\nhttps://alis.to/ocrybit/articles/${nise_article_id}\n\nその上で、BOTを再トリガーするために任意の額を投げ銭して下さい。（例: 0.01ALIS）`
          )
        }
        let deposit = await Helper.addDeposit(
          "nise",
          notification.acted_user_id
        )
      }
      return true
    } else {
      let text = comment.text
      let at = text.match(/@/g)
      if (at !== null && at.length > 1) {
        let error =
          "APIによる自動リプ（@）の多用はAPI機能が凍結される可能性があるので、ツイートに含まれる（@）は一つまでとさせていただきます。ご希望のツイートを１４０文字以内でこのコメントへの返信ではなく新しいスレッドに投稿した上で、BOTを再トリガーするために任意の額を投げ銭して下さい。（例: 0.01ALIS）"
        await Helper.postError(
          nise_article_id,
          error,
          comment,
          notification.acted_user_id,
          byDeposit
        )
        return true
      } else {
        let status = comment.text
        let res
        try {
          res = await Helper.postTweet(status)
        } catch (e) {
          res = e
        }
        if (typeof res.id_str !== "undefined") {
          let error =
            "ツイートしました！ご利用ありがとうございます！\n\nhttps://twitter.com/niserabbit/statuses/" +
            res.id_str
          await Helper.postError(
            nise_article_id,
            error,
            comment,
            notification.acted_user_id,
            byDeposit
          )
          if (byDeposit === true) {
            let deposit = await Helper.addDeposit(
              "nise",
              notification.acted_user_id,
              -1
            )
            console.log(deposit)
          }
          return true
        } else if (res.code === 186) {
          let error =
            "ツイートが長すぎます。ご希望のツイートを１４０文字以内でこのコメントへの返信ではなく新しいスレッドに投稿した上で、BOTを再トリガーするために任意の額を投げ銭して下さい。（例: 0.01ALIS）"
          await Helper.postError(
            nise_article_id,
            error,
            comment,
            notification.acted_user_id,
            byDeposit
          )
        } else if (res.code === 187) {
          let error =
            "連続して同じ内容のツイートはできません。ご希望のツイートを１４０文字以内でこのコメントへの返信ではなく新しいスレッドに投稿した上で、BOTを再トリガーするために任意の額を投げ銭して下さい。（例: 0.01ALIS）"
          await Helper.postError(
            nise_article_id,
            error,
            comment,
            notification.acted_user_id,
            byDeposit
          )
        } else if (typeof res.message === "string") {
          console.log(res.message)
          let error =
            "不明のエラーが置きました。お手数ですがBOT管理人の億ラビットくんまでお問い合わせ下さい。\n\nhttps://twitter.com/ocrybit"
          await Helper.postError(
            nise_article_id,
            error,
            comment,
            notification.acted_user_id,
            byDeposit
          )
        }
        return true
      }
    }
    return true
  } catch (e) {
    console.log(e)
    return false
  }
}

module.exports["2APJkQqzNbeb"] = async notification => {
  try {
    // 投げ銭ユーザーの最新の記事を取得
    const article = await Helper.getLatestArticle(notification.acted_user_id)
    if (article === false) {
      // 記事がない場合はスキップ
      return false
    } else {
      // お礼のコメントを投稿
      const article_id = article.article_id
      const text = `${
        notification.tip_value_normalized
      } ALISの投げ銭ありがとうございました！`
      const comment_result = await Helper.postComment(article.article_id, text)
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
