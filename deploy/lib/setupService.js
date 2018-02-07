'use strict'

const fs = require('fs')
const path = require('path')
const _ = require('lodash')

const BbPromise = require('bluebird')

module.exports = {
  setupService() {
    return BbPromise.bind(this)
      .then(this.createAPIGatewayIfNotExists) // Handle API Gateway first bcs we cannot deal same name services.
      .then(this.createBucketIfNotExists)
  },

  async createBucketIfNotExists() {
    const { templates, provider, serverless: { cli } } = this
    const bucket = templates.create.Resources.DeploymentBucket
    const cosBucket = provider.getCOSBucket(bucket)
    const api = provider.sdk.cos

    const headBucket = await api.headBucketAsync(cosBucket)

    if (!headBucket.BucketExist) {
      cli.log(`Creating bucket "${bucket.Bucket}"...`)

      return api.putBucketAsync(cosBucket)
    } else {
      cli.log(`Bucket "${bucket.Bucket}" already exists`)

      if (headBucket.BucketAuth || !cosBucket.ACL) return

      cli.log(`Updating bucket "${bucket.Bucket}" ACL.`)
      return api.putBucketAclAsync(cosBucket)
    }
  },

  async createAPIGatewayIfNotExists() {
    const { templates, provider, serverless: { cli } } = this
    const { APIGateway } = templates.create.Resources
    const api = provider.sdk.apigateway.setRegion(APIGateway.Region)

    const services = await api.describeServicesStatus({
      searchName: APIGateway.serviceName,
      limit: 100,
    })
    const matchedServices = services.serviceStatusSet.filter(s => s.serviceName === APIGateway.serviceName)

    if (matchedServices.length > 1) {
      cli.log(`ERROR: Qcloud returns ${res.totalCount} of "${APIGateway.serviceName}" api gateway services!
        Serverless cannot detect which is the right one.
        Consider modify another service name in your Qcloud Console.
      `)

      throw new Error(`Too many API Gateway services match name "${APIGateway.serviceName}"`)
    } else if (matchedServices.length === 0) {
      cli.log(`Creating api gateway service "${APIGateway.serviceName}"...`)

      const res = await api.createService(APIGateway)

      _.assign(templates.update.Resources.APIGateway, res)
    } else {
      cli.log(`API Gateway service "${APIGateway.serviceName}" already exists`)

      const ag = matchedServices[0]

      _.assign(templates.update.Resources.APIGateway, ag)

      if (ag.serviceDesc === APIGateway.serviceDesc && ag.protocol === APIGateway.protocol) return

      cli.log(`Updating api gateway service "${APIGateway.serviceName}"...`)

      const res = api.modifyService(_.assign({ serviceId: ag.serviceId }, APIGateway))
    }
  },
}
