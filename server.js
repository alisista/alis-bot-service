const app = require("express")()
const fs = require("fs")
let dirs = fs.readdirSync(__dirname + "/lamda")
for (let v of ["get", "post"]) {
  app[v]("/*", (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Headers", "X-Requested-With")
    next()
  })
}

for (let v of dirs) {
  let func = require(__dirname + `/lamda/${v}`)
  let p = v.split(".")[0]
  app.get(`/${p}`, func)
}

app.listen(5000)
