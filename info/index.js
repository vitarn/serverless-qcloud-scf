'use strict'

const validate = require('../lib/validate')
const getCloudInfo = require('./getCloudInfo')
const getApiKeyValues = require('./getApiKeyValues')
const display = require('./display')

/*
yarn sls info
yarn run v1.3.2
$ ../node_modules/.bin/sls info
Service Information
service: demo-sls-aws
stage: dev
region: cn-north-1
stack: demo-sls-aws-dev
api keys:
  None
endpoints:
  GET - https://9t4s3mxuu2.execute-api.cn-north-1.amazonaws.com.cn/dev/hello
  DELETE - https://9t4s3mxuu2.execute-api.cn-north-1.amazonaws.com.cn/dev/bye
functions:
  hello: demo-sls-aws-dev-hello
  bye: demo-sls-aws-dev-bye
✨  Done in 2.08s.
*/

class QcloudInfo {
  constructor(serverless, options) {
    this.serverless = serverless
    this.provider = this.serverless.getProvider('qcloud')
    this.options = options || {}
    Object.assign(
      this,
      validate,
      getCloudInfo,
      getApiKeyValues,
      display
    )

    this.commands = {
      qcloud: {
        type: 'entrypoint',
        commands: {
          info: {
            lifecycleEvents: [
              'validate',
              'gatherData',
              'displayServiceInfo',
              'displayApiKeys',
              'displayEndpoints',
              'displayFunctions',
              'displayStackOutputs',
            ],
          },
        },
      },
    }

    this.hooks = {
      'info:info': () => this.serverless.pluginManager.spawn('qcloud:info'),

      'deploy:deploy': async () => {
        if (this.options.noDeploy) return
        return this.serverless.pluginManager.spawn('qcloud:info')
      },

      'qcloud:info:validate': async () => {
        await this.validate()
      },

      'qcloud:info:gatherData': async () => {
        await this.getCloudInfo()
        await this.getApiKeyValues()
      },

      'qcloud:info:displayServiceInfo': async () => {
        await this.displayServiceInfo()
      },

      'qcloud:info:displayApiKeys': async () => {
        await this.displayApiKeys()
      },

      'qcloud:info:displayEndpoints': async () => {
        await this.displayEndpoints()
      },

      'qcloud:info:displayFunctions': async () => {
        await this.displayFunctions()
      },

      'qcloud:info:displayStackOutputs': async () => {
        await this.displayStackOutputs()
      },
    }
  }
}

module.exports = QcloudInfo
