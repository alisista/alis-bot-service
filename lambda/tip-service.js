const path = require("path")
require("dotenv").config({ path: path.resolve(__dirname, "../.env") })
const { parse } = require("url")
const R = require("ramda")
const alis = require("alis")
const DB = require("monk")(process.env.MONGODB_URL)
const db = {
  tips: DB.get("tips")
}
let actions = require("../lib/actions")
global.fetch = require("node-fetch").default

const tip_divider = 1000000000000000000

const cred = require("../lib/cred")

module.exports = async (req, res) => {
  let tipped = {}
  let actions_executed = []
  const { query } = parse(req.url, true)
  try {
    const tips = R.compose(
      R.map(v => {
        v.tip_value_normalized = v.tip_value / tip_divider
        return v
      }),
      R.filter(v => !R.isNil(actions[v.article_id])),
      R.filter(R.propEq("type", "tip")),
      R.prop("Items")
    )(await alis.p.me.notifications({ limit: 100 }, cred()))
    const article_ids = R.compose(
      R.uniq,
      R.pluck("article_id")
    )(tips)
    let histories = R.compose(
      R.map(R.prop("history")),
      R.indexBy(R.prop("article_id"))
    )(
      await db.tips.find({
        article_id: { $in: article_ids }
      })
    )
    for (let id of R.difference(article_ids)(R.keys(histories))) {
      histories[id] = {}
    }
    const promises = R.compose(
      R.addIndex(R.map)((v, i) => {
        return {
          index: i,
          tip: v,
          promise: actions[v.article_id](v)
        }
      }),
      R.filter(v => {
        return R.isNil(
          histories[v.article_id][`${v.acted_user_id}@${v.created_at}`]
        )
      })
    )(tips)
    const results = await Promise.all(R.pluck("promise")(promises))
    const executed_at = Date.now()
    const updates = R.compose(
      R.map(v => {
        const id = `${v.tip.acted_user_id}@${v.tip.created_at}`
        histories[v.tip.article_id][id] = executed_at
        actions_executed.push({
          notification: v.tip,
          executed_at: executed_at
        })
        return db.tips.update(
          { article_id: v.tip.article_id },
          {
            article_id: v.tip.article_id,
            history: histories[v.tip.article_id]
          },
          { upsert: true }
        )
      }),
      R.filter(v => results[v.index])
    )(promises)
    await Promise.all(updates)
    res.end(JSON.stringify(actions_executed))
  } catch (e) {
    console.log(e)
    if (
      typeof e.error !== "undefined" &&
      typeof e.response !== "undefined" &&
      typeof e.response.message !== "undefined"
    ) {
      res.end(e.response.message)
    } else {
      try {
        e.error = e.toString()
      } catch (e2) {}
      res.end(JSON.stringify(e))
    }
  }
}
