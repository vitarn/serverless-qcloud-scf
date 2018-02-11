'use strict'

const validate = require('../lib/validate')
// const setDefaults = require('../lib/utils')
const emptyDeploymentBucket = require('./lib/emptyDeploymentBucket')
const removeDeployment = require('./lib/removeDeployment')

class QcloudRemove {
  constructor(serverless, options) {
    this.serverless = serverless
    this.options = options
    this.provider = this.serverless.getProvider('qcloud')

    Object.assign(
      this,
      validate,
      // setDefaults,
      // setDeploymentBucketName,
      emptyDeploymentBucket,
      removeDeployment,
      // monitorDeployment
    )

    this.hooks = {
      'before:remove:remove': async () => {
        await this.validate()
        // await this.setDefaults()
        // await this.setDeploymentBucketName()
      },

      'remove:remove': async () => {
        await this.emptyDeploymentBucket()
        await this.removeDeployment()
      },
    }
  }
}

module.exports = QcloudRemove
