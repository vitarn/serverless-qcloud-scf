'use strict'

const BbPromise = require('bluebird')
const path = require('path')
const chalk = require('chalk')

const validate = require('../shared/validate')
const utils = require('../shared/utils')
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
      utils,
      loadTemplates,
      setupService,
      uploadArtifacts,
      setupFunctions,
      setupEvents
    )

    this.hooks = {
      'before:deploy:deploy': () => BbPromise.bind(this)
        .then(this.validate)
        .then(this.setDefaults)
        .then(this.loadTemplates),

      'deploy:deploy': () => BbPromise.bind(this)
        .then(this.setupService)
        .then(this.uploadArtifacts)
        .then(this.setupFunctions)
        .then(this.setupEvents)
        .then(this.log)
    }
  }

  log() {
    const { templates, serverless: { cli } } = this
    const { APIGateway, APIGatewayApis, APIGatewayRelease, CloudFunctions } = templates.update.Resources

    cli.consoleLog(`    ${chalk.yellow.underline('API Gateway Information')}
      ${chalk.yellow('service id:')} ${APIGateway.serviceId}
      ${chalk.yellow('service name:')} ${APIGateway.serviceName}
      ${chalk.yellow('region:')} ${APIGateway.Region}
      ${chalk.yellow('endpoints:')}
        ${APIGatewayApis.map(a => `${a.requestConfig.method} - ${APIGateway.protocol === 'https' ? 'https://' : ''}${APIGateway.subDomain}/${APIGatewayRelease.environmentName}${a.requestConfig.path}`).join(`\n${' '.repeat(8)}`)}
      ${chalk.yellow('functions:')}
        ${CloudFunctions.map(f => `${f.functionName}`).join(`\n${' '.repeat(8)}`)}
    `)
  }
}

module.exports = QcloudDeploy
