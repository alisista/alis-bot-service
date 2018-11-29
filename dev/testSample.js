const fs = require("fs")
const path = require("path")
require("dotenv").config({ path: path.resolve(__dirname, "../.env") })
const alis = require("alis")
const article_id = process.argv[2]
const sample = process.argv[3] || "sample"
let actions = require(`../lib/${process.argv[4] || "actions"}`)
if (typeof article_id === "undefined") {
  console.log("no article_id specified")
  process.exit()
}
const tip_divider = 1000000000000000000
let sample_data
try {
  sample_data = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, `../data/${sample}.json`))
  )
} catch (e) {
  console.log(e)
  process.exit()
}
if (typeof actions[article_id] !== "function") {
  console.log(`no function exists for ${article_id}`)
  process.exit()
} else {
  if (typeof sample_data.tip_value !== "undefined") {
    sample_data.tip_value_normalized = sample_data.tip_value / tip_divider
  }
  console.log(`[test tip service] on ${article_id}`)
  console.log(sample_data)
  actions[article_id](sample_data)
    .then(res => {
      console.log(`successful: ${res}`)
      process.exit()
    })
    .catch(e => {
      console.log(e)
      process.exit()
    })
}
