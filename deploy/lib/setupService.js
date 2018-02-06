'use strict'

const fs = require('fs')
const path = require('path')
const _ = require('lodash')

const BbPromise = require('bluebird')

module.exports = {
  setupService() {
    // this.logProjectSpec = this.templates.create.Resources[this.provider.getLogProjectId()].Properties
    // this.logStoreSpec = this.templates.create.Resources[this.provider.getLogStoreId()].Properties
    // this.logIndexSpec = this.templates.create.Resources[this.provider.getLogIndexId()].Properties

    // this.logProject = undefined
    // this.logStore = undefined
    // this.logIndex = undefined

    return BbPromise.bind(this)
      // .then(this.createLogConfigIfNotExists)
      // .then(this.setupExecRole)
      // .then(() => {
      //   // HACK: must wait for a while for the ram policy to take effect
      //   return this.provider.sleep(this.provider.PROJECT_DELAY)
      // })
      // .then(this.checkForExistingService)
      // .then(this.createServiceIfNotExists)
      .then(this.createBucketIfNotExists)
      .then(this.createAPIGatewayIfNotExists)
  },

  setupExecRole() {
    const role = this.templates.create.Resources[this.provider.getExecRoleLogicalId()].Properties
    return BbPromise.bind(this)
      .then(() => this.setupRole(role))
      .then((execRole) => this.execRole = execRole)
  },

  createLogConfigIfNotExists() {
    return BbPromise.bind(this)
      .then(this.createLogProjectIfNotExists)
      .then(this.createLogStoreIfNotExists)
      .then(this.createLogIndexIfNotExists)
  },

  createLogProjectIfNotExists() {
    const projectName = this.logProjectSpec.projectName
    return this.provider.getLogProject(projectName)
      .then((logProject) => {
        if (logProject) {
          this.serverless.cli.log(`Log project ${projectName} already exists.`)
          this.logProject = logProject
          return
        }

        this.serverless.cli.log(`Creating log project ${projectName}...`)
        return this.provider.createLogProject(projectName, this.logProjectSpec)
          .then((createdProject) => {
            this.serverless.cli.log(`Created log project ${projectName}`)
            this.logProject = createdProject
          })
      })
  },

  createLogStoreIfNotExists() {
    if (!this.logProject) {
      return
    }
    const projectName = this.logProjectSpec.projectName
    const storeName = this.logStoreSpec.storeName
    return this.provider.getLogStore(projectName, storeName)
      .then((logStore) => {
        if (logStore) {
          this.serverless.cli.log(`Log store ${projectName}/${storeName} already exists.`)
          this.logStore = logStore
          return
        }

        this.serverless.cli.log(`Creating log store ${projectName}/${storeName}...`)
        return this.provider.createLogStore(projectName, storeName, this.logStoreSpec)
          .then((createdStore) => {
            this.serverless.cli.log(`Created log store ${projectName}/${storeName}`)
            this.logStore = createdStore
          })
      })
  },

  createLogIndexIfNotExists() {
    if (!this.logProject || !this.logStore) {
      return
    }
    const projectName = this.logProjectSpec.projectName
    const storeName = this.logStoreSpec.storeName
    return this.provider.getLogIndex(projectName, storeName)
      .then((logIndex) => {
        if (logIndex) {
          this.serverless.cli.log(`Log store ${projectName}/${storeName} already has an index.`)
          this.logIndex = logIndex
          return
        }

        this.serverless.cli.log(`Creating log index for ${projectName}/${storeName}...`)
        return this.provider.createLogIndex(projectName, storeName, this.logIndexSpec)
          .then((createdIndex) => {
            this.serverless.cli.log(`Created log index for ${projectName}/${storeName}`)
            this.logIndex = createdIndex
          })
      })
  },

  checkForExistingService() {
    const service = this.templates.create.Resources[this.provider.getServiceId()].Properties

    return this.provider.getService(service.name)
  },

  createServiceIfNotExists(foundService) {
    const service = this.templates.create.Resources[this.provider.getServiceId()].Properties

    if (foundService) {
      this.serverless.cli.log(`Service ${service.name} already exists.`)
      return BbPromise.resolve()
    }

    this.serverless.cli.log(`Creating service ${service.name}...`)
    // TODO(joyeecheung): generate description
    // TODO(joyeecheung): update service
    const spec = Object.assign({
      role: this.execRole.Arn
    }, service)
    return this.provider.createService(service.name, spec)
      .then((createdService) => {
        this.serverless.cli.log(`Created service ${service.name}`)
      })
  },

  createBucketIfNotExists() {
    const { templates, provider, serverless: { cli } } = this

    const bucket = templates.create.Resources.DeploymentBucket
    const cosBucket = provider.getCOSBucket(bucket)

    return provider.sdk.cos.headBucketAsync(cosBucket)
      .catch(err => {
        cli.log(`ERROR: Qcloud headBucket fail`)
        throw err.error
      })
      .then(headBucket => {
        if (headBucket.BucketExist) { 
          cli.log(`Bucket ${bucket.Bucket} already exists.`)
          if (!headBucket.BucketAuth && cosBucket.ACL) {
            cli.log(`Update bucket ${bucket.Bucket} ACL.`)
            return provider.sdk.cos.putBucketAclAsync(cosBucket)
          }

          return
        }

        cli.log(`Creating bucket ${bucket.Bucket}...`)
        return provider.sdk.cos.putBucketAsync(cosBucket)
          .then(() => {
            cli.log(`Created bucket ${bucket.Bucket}`)
          })
      })
  },

  createAPIGatewayIfNotExists() {
    const { templates, provider, serverless: { cli } } = this
    const { APIGateway } = templates.create.Resources

    cli.log(`Creating api gateway ${APIGateway.serviceName}...`)
    return provider.sdk.apigateway.requestAsync(_.assign({}, APIGateway, {
      Action: 'CreateService',
    }))
      .catch(err => {
        cli.log('ERROR: Qcloud API Gateway CreateService fail')
        console.log(err)
        throw err
      })
      .then(res => {
        console.log(res)
      })
  },
}
