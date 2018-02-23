'use strict'


module.exports = {
  async getCloudInfo() {
    const { provider, serverless: { service, cli } } = this

    // NOTE: this is the global gatheredData object which will be passed around
    this.gatheredData = {
      info: {
        service: service.service,
        region: provider.region,
        stage: provider.stage,
        endpoint: '',
        unreleased: false,
        functions: [],
      },
      output: {
        apigateway: {},
      },
    }

    // Functions
    service.getAllFunctions().forEach(name => {
      const func = service.getFunction(name)
      this.gatheredData.info.functions.push({
        name,
        deployedName: func.name,
      })
    })

    // API Gateway
    const apigateway = this.gatheredData.output.apigateway = await provider.getAPIGatewayService()

    if (!apigateway) return

    const { releaseStage } = provider

    this.gatheredData.info.endpoint = apigateway.protocol === 'https'
      ? `https://${apigateway.subDomain}`
      : apigateway.subDomain
    if (!this.gatheredData.info.endpoint.endsWith('/')) this.gatheredData.info.endpoint += '/'
    this.gatheredData.info.endpoint += releaseStage
    this.gatheredData.info.unrelease = !apigateway.availableEnvironments.includes(releaseStage)
  },
}
