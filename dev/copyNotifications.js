const fs = require("fs")
const path = require("path")
require("dotenv").config({ path: path.resolve(__dirname, "../.env") })
const alis = require("alis")
const cred = require("../lib/cred")
const name = process.argv[2] || Date.now()
const limit = process.argv[3] || 100
alis.p.me
  .notifications({ limit: limit }, cred())
  .then(json => {
    console.log(json)
    fs.writeFileSync(
      path.resolve(__dirname, `../data/${name}.json`),
      JSON.stringify(json)
    )
  })
  .catch(e => {
    console.log(e)
    process.exit()
  })
