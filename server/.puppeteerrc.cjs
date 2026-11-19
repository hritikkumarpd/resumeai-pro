// Keep the pinned browser inside the deployed server directory on Render.
const path = require('node:path')
module.exports = {
  cacheDirectory: path.join(__dirname, '.cache', 'puppeteer'),
  'chrome-headless-shell': { skipDownload: true },
}
