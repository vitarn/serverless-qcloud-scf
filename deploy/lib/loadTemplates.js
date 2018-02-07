'use strict'

const path = require('path')

module.exports = {
  async loadTemplates() {
    const { serverless: { config, utils } } = this
    const createFilePath = path.join(config.servicePath, '.serverless', 'configuration-template-create.json')
    const updateFilePath = path.join(config.servicePath, '.serverless', 'configuration-template-update.json')

    this.templates = {
      create: utils.readFileSync(createFilePath),
      update: utils.readFileSync(updateFilePath),
    }
  }
}
