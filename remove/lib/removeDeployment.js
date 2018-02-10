'use strict'

const _ = require('lodash')

module.exports = {
  async removeDeployment() {
    const { serverless: { cli } } = this

    cli.log('Removing deployment...')

    await this.removeAPIGateway()
    await this.removeCloudFunctions()
  },

  async removeAPIGateway() {
    const { provider, serverless: { cli } } = this

    cli.log('Removing API Gateway...')

    const sdk = provider.sdk.apigateway.setRegion(provider.region)

    const { serviceStatusSet } = await sdk.describeServicesStatus({
      searchName: provider.apiGatewayServiceName,
      limit: 100,
    })
    const services = serviceStatusSet.filter(s => s.serviceName === provider.apiGatewayServiceName)

    if (services.length > 1) {
      cli.log(`WARN: Found ${services.length} API Gateway services! Cannot detect which is the right one.`)
      return
    }

    if (services.length === 0) {
      return
    }

    const [service] = services

    const { apiIdStatusSet } = await sdk.describeApisStatus({
      serviceId: service.serviceId,
      limit: 100,
    })
    const allApiRequests = this.getAllApiRequests()
    const apis = apiIdStatusSet.filter(api =>
      allApiRequests.some(a => a.method === api.method && a.path === api.path))

    if (apis.length > 0) {
      await Promise.all(apis.map(api => {
        cli.log(`Removing API ${api.apiName}...`)
        return sdk.deleteApi({
          serviceId: service.serviceId,
          apiId: api.apiId,
        })
      }))
    }

    // if (apis.length <= apiIdStatusSet.length) return

    const { environmentList } = await sdk.describeServiceEnvironmentList({ serviceId: service.serviceId })
    const envs = environmentList.filter(env => env.status)
    if (envs.length > 0) {
      await Promise.all(envs.map(env => {
        cli.log(`Unreleasing API Gateway service environment "${env.environmentName}"...`)
        return sdk.unReleaseService({
          serviceId: service.serviceId,
          environmentName: env.environmentName,
        })
      }))
    }

    cli.log(`Trying delete API Gateway service "${service.serviceName}"`)
    try {
      await sdk.deleteService({ serviceId: service.serviceId })
    } catch(err) {
      provider.cli.warn(err.message)
      cli.log(`Leave there since it's not empty!`)
    }
  },

  getAllApiRequests() {
    const { serverless: { service, cli } } = this

    return service.getAllFunctions().map((functionName) => {
      const funcObject = service.getFunction(functionName)
      const { http: { method, path } } = funcObject.events.find(event => event.http)
      return {
        method: _.toUpper(method),
        path: path.startsWith('/') ? path : `/${path}`,
      }
    })
  },

  async removeCloudFunctions() {
    const { provider, serverless: { service, cli } } = this
    const sdk = provider.sdk.scf
    const names = service.getAllFunctionsNames()

    await Promise.all(names.map(name => {
      cli.log(`Removing function ${name}`)
      return sdk.requestAsync({
        Region: provider.region,
        Action: 'DeleteFunction',
        functionName: name,
      })
    })) 
  },
}
