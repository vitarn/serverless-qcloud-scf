'use strict'

const path = require('path')
const fse = require('fs-extra')

module.exports = {
  async cleanupServerlessDir() {
    const { serverless: { config: { servicePath } } } = this

    if (!servicePath) return

    const serverlessDirPath = path.join(servicePath, '.serverless')

    if (await fse.pathExists(serverlessDirPath)) {
      return fse.remove(serverlessDirPath)
    }
  },
}
