module.exports = (method = "GET") => {
  let options = {
    method: method,
    username: process.env.ALIS_USERNAME
  }
  if (typeof process.env.ALIS_REFRESH_TOKEN !== "undefined") {
    options.refresh_token = process.env.ALIS_REFRESH_TOKEN
  } else {
    options.password = process.env.ALIS_PASSWORD
  }
  return options
}
