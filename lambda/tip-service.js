const path = require("path")
require("dotenv").config({ path: path.resolve(__dirname, "../.env") })
const { parse } = require("url")
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
    let json = await alis.p.me.notifications({ limit: 100 }, cred())
    let tips_received = {}
    for (let v of json.Items) {
      if (v.type === "tip") {
        v.tip_value_normalized = v.tip_value / tip_divider
        console.log(
          `[${v.article_id}] ${v.tip_value_normalized} ALIS from ${
            v.acted_user_id
          }`
        )
        if (typeof tips_received[v.article_id] === "undefined") {
          tips_received[v.article_id] = []
        }
        tips_received[v.article_id].push(v)
        if (typeof actions[v.article_id] !== "undefined") {
          let id = `${v.acted_user_id}@${v.created_at}`
          if (typeof tipped[v.article_id] === "undefined") {
            let doc = (await db.tips.findOne({
              article_id: v.article_id
            })) || {
              history: {}
            }
            tipped[v.article_id] = doc.history
          }
          if (typeof tipped[v.article_id][id] === "undefined") {
            let action = await actions[v.article_id](v)
            if (action === true) {
              let executed_at = Date.now()
              tipped[v.article_id][id] = executed_at
              actions_executed.push({
                notification: v,
                executed_at: executed_at
              })
              await db.tips.update(
                { article_id: v.article_id },
                { article_id: v.article_id, history: tipped[v.article_id] },
                { upsert: true }
              )
            }
          }
        }
      }
    }
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
