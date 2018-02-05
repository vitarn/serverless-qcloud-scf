'use strict'

/* eslint no-use-before-define: 0 */

const path = require('path')

const _ = require('lodash')
const BbPromise = require('bluebird')

module.exports = {
  prepareDeployment() {
    const { provider, serverless: { service, utils, cli } } = this

    cli.log(`Prepare deployment template`)

    const deploymentTemplate = utils.readFileSync(
      path.join(
        __dirname,
        '..',
        'templates',
        'core-configuration-template.json'))
      
    const { DeploymentBucket } = deploymentTemplate.Resources
    const { region } = service.provider
    const name = `${provider.naming.deploymentBucketPrefix}${region}`

    DeploymentBucket.Bucket = name
    DeploymentBucket.Region = region

    deploymentTemplate.Resources.CloudFunctions = []

    service.provider.compiledConfigurationTemplate = deploymentTemplate

    return BbPromise.resolve()
  },
}
