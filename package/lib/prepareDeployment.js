'use strict'

/* eslint no-use-before-define: 0 */

const path = require('path')
const _ = require('lodash')

module.exports = {
  async prepareDeployment() {
    const { provider, options, serverless: { service, utils, cli } } = this

    cli.log(`Prepare deployment template`)

    const deploymentTemplate = utils.readFileSync(
      path.join(
        __dirname,
        '..',
        'templates',
        'core-configuration-template.json'
      )
    )
    const Resources = deploymentTemplate.Resources = deploymentTemplate.Resources || {}
    const DeploymentBucket = Resources.DeploymentBucket = Resources.DeploymentBucket || {}
    const CloudFunctions = Resources.CloudFunctions = Resources.CloudFunctions || []
    const APIGateway = Resources.APIGateway = Resources.APIGateway || {}
    const APIGatewayApis = Resources.APIGatewayApis = Resources.APIGatewayApis || []

    Object.assign(DeploymentBucket, {
      Bucket: provider.deploymentBucketName,
      Region: provider.region,
      ACL: 'public-read',
    })

    const functionHasHTTP = service.getAllFunctions().some((functionName) => {
      const funcObject = service.getFunction(functionName)

      return funcObject.events && funcObject.events.some(event => event.http)
    })

    if (functionHasHTTP && _.isEmpty(deploymentTemplate.Resources.APIGateway)) {
      deploymentTemplate.Resources.APIGateway = {
        Region: provider.region,
        serviceName: provider.apiGatewayServiceName,
        protocol: provider.apiGatewayServiceProtocol,
        serviceDesc: provider.apiGatewayServiceDescription,
      }
    }

    service.provider.compiledConfigurationTemplate = deploymentTemplate
  },
}
