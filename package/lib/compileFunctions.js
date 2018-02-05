'use strict'

/* eslint no-use-before-define: 0 */

const path = require('path')

const _ = require('lodash')
const BbPromise = require('bluebird')

module.exports = {
  compileFunctions() {
    const { provider, options, serverless: { service, utils, cli } } = this

    const artifactFilePath = service.package.artifact
    const fileName = artifactFilePath.split(path.sep).pop()

    service.package.artifactFilePath = `${service.package.artifactDirectoryName}/${fileName}`

    const CloudFunctions = service.provider.compiledConfigurationTemplate.Resources.CloudFunctions = []

    service.getAllFunctions().forEach((functionName) => {
      const funcObject = service.getFunction(functionName)

      cli.log(`Compiling function "${functionName}"...`)

      const funcTemplate = {
        Region: _.get(options, 'region')
          || _.get(this, 'serverless.service.provider.region')
          || 'gz',
        functionName: funcObject.name,
        handler: funcObject.handler,
        description: funcObject.description,
        runtime: _.capitalize(_.get(funcObject, 'runtime')
          || _.get(this, 'serverless.service.provider.runtime')
          || 'Nodejs6.10'),
        memorySize: _.get(funcObject, 'memorySize')
          || _.get(this, 'serverless.service.provider.memorySize')
          || 128,
        timeout: _.get(funcObject, 'timeout')
          || _.get(this, 'serverless.service.provider.timeout')
          || 3,
      }

      CloudFunctions.push(funcTemplate)
    })

    return BbPromise.resolve()
  },
}
