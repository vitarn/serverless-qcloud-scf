'use strict'

const path = require('path')
const chalk = require('chalk')

const validate = require('../lib/validate')
// const utils = require('../lib/utils')
const loadTemplates = require('./lib/loadTemplates')
const setupService = require('./lib/setupService')
const uploadArtifacts = require('./lib/uploadArtifacts')
const setupFunctions = require('./lib/setupFunctions')
const setupEvents = require('./lib/setupEvents')

class QcloudDeploy {
  constructor(serverless, options) {
    this.serverless = serverless
    this.options = options
    this.provider = this.serverless.getProvider('qcloud')

    Object.assign(
      this,
      validate,
      // utils,
      loadTemplates,
      setupService,
      uploadArtifacts,
      setupFunctions,
      setupEvents
    )

    this.hooks = {
      'before:deploy:deploy': async () => {
        await this.validate()
        // await this.setDefaults()
        await this.loadTemplates()
      },

      'deploy:deploy': async () => {
        await this.setupService()
        await this.uploadArtifacts()
        await this.setupFunctions()
        await this.setupEvents()
      },
    }
  }
}

module.exports = QcloudDeploy
