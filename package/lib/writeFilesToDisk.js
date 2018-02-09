'use strict'

/* eslint no-use-before-define: 0 */

const path = require('path')

module.exports = {
  async saveCreateTemplateFile() {
    const filePath = path.join(this.serverless.config.servicePath,
      '.serverless', 'configuration-template-create.json')

    this.serverless.utils.writeFileSync(filePath,
      this.serverless.service.provider.compiledConfigurationTemplate)
  },

  async saveUpdateTemplateFile() {
    const filePath = path.join(this.serverless.config.servicePath,
      '.serverless', 'configuration-template-update.json')

    this.serverless.utils.writeFileSync(filePath,
      this.serverless.service.provider.compiledConfigurationTemplate)
  },
}
