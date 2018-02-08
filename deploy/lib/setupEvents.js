'use strict'

const fs = require('fs')
const path = require('path')
const _ = require('lodash')

const BbPromise = require('bluebird')

module.exports = {
  async setupEvents() {
    const { templates } = this

    this.apis = templates.update.Resources.APIGatewayApis
    this.triggers = []

    return BbPromise.bind(this)
      // .then(this.setupInvokeRole)
      .then(this.createApisIfNeeded)
      .then(this.releaseAPIGateway)
    // .then(this.createTriggersIfNeeded)
  },

  async createApisIfNeeded() {
    if (!this.apis.length) return

    const { provider, templates, serverless: { cli } } = this
    const { Resources } = templates.update
    const { apigateway } = provider.sdk
    const { serviceId } = Resources.APIGateway

    return BbPromise.all(this.apis.map(async api => {
      _.assign(api, { serviceId })

      const res = await apigateway.describeApisStatus({
        serviceId,
        searchName: api.requestConfig.path,
        limit: 100,
      })

      const existsApis = res.apiIdStatusSet.filter(
        a => a.method === api.requestConfig.method && a.path === api.requestConfig.path
      )

      // Qcloud disallow same "METHOD /path". So existsApis length is zero or one.
      if (existsApis.length === 0) {
        cli.log(`Creating api ${api.requestConfig.path}...`)

        const res = await apigateway.createApi(api)

        _.assign(api, res)
      } else {
        cli.log(`Updating api ${api.requestConfig.path}...`)

        // Assign here bcs modifiApi return {}
        _.assign(api, _.pick(existsApis[0], 'apiId', 'serviceId'))

        const res = await apigateway.modifyApi(api)
      }
    }))

    // return BbPromise.bind(this)
    //   .then(this.createApiGroupIfNotExists)
    //   .then(this.checkExistingApis)
    //   .then(this.createOrUpdateApis)
    //   .then(this.deployApis)
  },

  async releaseAPIGateway() {
    const { provider, options, service, templates, serverless: { cli } } = this
    const { APIGateway } = templates.update.Resources
    const { apigateway } = provider.sdk
    const stage = _.get(options, 'stage')
      || _.get(service, 'provider.stage')
      || 'dev'

    cli.log(`Publishing API Gateway service ${APIGateway.serviceName}...`)

    // 'test' | 'prepub' | 'release'
    const envMap = {
      dev: 'test',
      test: 'prepub',
      prod: 'release'
    }

    const res = await apigateway.releaseService({
      serviceId: APIGateway.serviceId,
      environmentName: envMap[stage],
      releaseDesc: 'Release by serverless'
    })

    templates.update.Resources.APIGatewayRelease = _.assign({}, res, {
      environmentName: envMap[stage],
    })
  },

  createTriggersIfNeeded() {
    if (!this.triggers.length) {
      return BbPromise.resolve()
    }

    return BbPromise.bind(this)
      .then(this.checkExistingTriggers)
      .then(this.createOrUpdateTriggers)
  },

  checkExistingApis() {
    if (!this.apis.length) {
      return
    }

    return this.provider.getApis({
      GroupId: this.apiGroup.GroupId
    }).then((apis) => {
      this.apiMap = new Map(apis.map((api) => [api.ApiName, api]))
      this.apis.forEach((api) => {
        if (!this.apiMap.get(api.ApiName)) {
          this.apiMap.set(api.ApiName, false)
        }
      })
    })
  },

  createOrUpdateApis(group) {
    if (!this.apis.length) {
      return
    }

    return BbPromise.mapSeries(this.apis,
      (api) => this.createOrUpdateApi(api))
  },

  createOrUpdateApi(api) {
    const group = this.apiGroup
    const role = this.invokeRole
    const apiInMap = this.apiMap.get(api.ApiName)
    if (apiInMap) {
      const apiProps = Object.assign({ ApiId: apiInMap.ApiId }, api)
      this.serverless.cli.log(`Updating API ${api.ApiName}...`)
      return this.provider.updateApi(group, role, apiProps)
        .then((newApi) => {
          this.serverless.cli.log(`Updated API ${api.ApiName}`)
        }, (err) => {
          this.serverless.cli.log(`Failed to update API ${api.ApiName}!`)
          throw err
        })
    }
    this.serverless.cli.log(`Creating API ${api.ApiName}...`)
    return this.provider.createApi(group, role, api)
      .then((newApi) => {
        this.serverless.cli.log(`Created API ${api.ApiName}`)
        this.apiMap.set(api.ApiName, newApi)
      }, (err) => {
        this.serverless.cli.log(`Failed to create API ${api.ApiName}!`)
        throw err
      })

  },

  deployApis() {
    const group = this.apiGroup
    return BbPromise.mapSeries(this.apis, (api) => {
      const apiProps = this.apiMap.get(api.ApiName)
      this.serverless.cli.log(`Deploying API ${api.ApiName}...`)
      return this.provider.deployApi(group, apiProps).then(
        () => {
          this.serverless.cli.log(`Deployed API ${api.ApiName}`)
          const config = api.RequestConfig
          const func = api.ServiceConfig.FunctionComputeConfig
          this.serverless.cli.log(`${config.RequestHttpMethod} ` +
            `http://${this.apiGroup.SubDomain}${config.RequestPath} -> ` +
            `${func.ServiceName}.${func.FunctionName}`)
        },
        (err) => {
          this.serverless.cli.log(`Failed to deploy API ${api.ApiName}!`)
          throw err
        })
    })
  },

  checkExistingTriggers() {
    this.triggerMap = new Map()
    return BbPromise.mapSeries(this.triggers, (trigger) => {
      return this.provider.getTrigger(
        trigger.serviceName, trigger.functionName, trigger.triggerName
      ).then((foundTrigger) => {
        if (foundTrigger) {
          this.triggerMap.set(trigger.triggerName, foundTrigger)
        }
      })
    })
  },

  createOrUpdateTriggers() {
    if (!this.triggers.length) {
      return
    }

    return BbPromise.mapSeries(this.triggers,
      (trigger) => this.createOrUpdateTrigger(trigger))
  },

  createOrUpdateTrigger(trigger) {
    const role = this.invokeRole
    const triggerName = trigger.triggerName
    const serviceName = trigger.serviceName
    const functionName = trigger.functionName
    const triggerInMap = this.triggerMap.get(triggerName)
    if (triggerInMap) {
      this.serverless.cli.log(`Updating trigger ${triggerName}...`)
      return this.provider.updateTrigger(serviceName, functionName, triggerName, trigger, role)
        .then((newtrigger) => {
          this.serverless.cli.log(`Updated trigger ${triggerName}`)
        }, (err) => {
          this.serverless.cli.log(`Failed to update trigger ${triggerName}!`)
          throw err
        })
    }
    this.serverless.cli.log(`Creating trigger ${triggerName}...`)
    return this.provider.createTrigger(serviceName, functionName, trigger, role)
      .then((newtrigger) => {
        this.serverless.cli.log(`Created trigger ${triggerName}`)
        this.triggerMap.set(triggerName, newtrigger)
      }, (err) => {
        this.serverless.cli.log(`Failed to create trigger ${triggerName}!`)
        throw err
      })

  }
}
