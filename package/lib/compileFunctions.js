'use strict'

/* eslint no-use-before-define: 0 */

const path = require('path')
const _ = require('lodash')

module.exports = {
  async compileFunctions() {
    const { provider, options, serverless: { service, utils, cli } } = this

    const artifactFilePath = service.package.artifact
    const fileName = artifactFilePath.split(path.sep).pop()

    service.package.artifactFilePath = `${service.package.artifactDirectoryName}/${fileName}`

    const CloudFunctions = service.provider.compiledConfigurationTemplate.Resources.CloudFunctions = []

    service.getAllFunctions().forEach((functionName) => {
      const funcObject = service.getFunction(functionName)

      cli.log(`Compiling function "${functionName}"...`)
      // "environment":{"variables":[{"key":"NODE_ENV","value":"production"},{"key":"ABC","value":"1"}]},"vpc":{"vpcId":"","subnetId":""}}
      const funcTemplate = {
        Region: _.get(options, 'region')
          || _.get(service, 'provider.region')
          || 'gz',
        functionName: funcObject.name,
        handler: funcObject.handler,
        description: funcObject.description,
        runtime: _.capitalize(_.get(funcObject, 'runtime')
          || _.get(service, 'provider.runtime')
          || 'Nodejs6.10'),
        memorySize: _.get(funcObject, 'memorySize')
          || _.get(service, 'provider.memorySize')
          || 128,
        timeout: _.get(funcObject, 'timeout')
          || _.get(service, 'provider.timeout')
          || 3,
        environment: !funcObject.environment
          ? undefined
          : {
            variables: _.keys(funcObject.environment).map(key => ({ key, value: funcObject.environment[key] })),
          },
      }

      CloudFunctions.push(_.omitBy(funcTemplate, _.isUndefined))

      if (funcObject.events) {
        this.validateEventsProperty(funcObject, funcTemplate.functionName)

        funcObject.events.forEach(event => {
          if (event.http) {
            this.compileAPIGateway(event.http, funcObject, funcTemplate)
          }
        })
      }
    })
  },

  compileAPIGateway(http, funcObject, funcTemplate) {
    const { provider, options, serverless: { service, utils, cli } } = this
    const { APIGatewayApis } = service.provider.compiledConfigurationTemplate.Resources

    const apiTemplate = {
      Region: _.get(options, 'region')
        || _.get(service, 'provider.region')
        || 'gz',
      apiName: http.name || funcObject.name,
      apiDesc: http.description,
      serviceType: 'SCF',
      serviceTimeout: funcTemplate.timeout,
      authRequired: http.private ? 'TRUE' : 'FALSE',
      requestConfig: {
        method: _.toUpper(http.method || 'GET'),
        path: `/${http.path || ''}`,
      },
      serviceScfFunctionName: funcObject.name,
      responseType: _.toUpper(http.responseType) || 'JSON',
      responseSuccessExample: http.responseSuccessExample,
      responseFailExample: http.responseFailExample,
      responseErrorCodes: !http.responseErrorCodes
        ? undefined
        : http.responseErrorCodes.map(({ code, message, description }) => ({
          code: code,
          msg: message,
          desc: description,
        })),
    }

    cli.log(`Compiling api "${apiTemplate.apiName}"...`)

    APIGatewayApis.push(_.omitBy(apiTemplate, _.isUndefined))
  },

  validateEventsProperty(funcObject, functionName) {
    const { serverless: { cli } } = this

    if (!funcObject.events || funcObject.events.length === 0) {
      cli.log(`WARN: Missing "events" property for function "${functionName}".`)
    }

    const supportedEvents = ['http', 'timer', 'cos', 'cmq']
    
    funcObject.events.forEach(event => {
      const eventType = Object.keys(event).pop()

      if (!supportedEvents.includes(eventType)) {
        throw new Error(`Event type "${eventType}" of function "${functionName}" not supported.
          supported event types are: ${supportedEvents.join(', ')}`)
      }
    })
  },
}
