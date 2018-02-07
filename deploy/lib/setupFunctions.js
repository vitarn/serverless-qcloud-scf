'use strict'

const fs = require('fs')
const path = require('path')
const _ = require('lodash')

const BbPromise = require('bluebird')

module.exports = {
  setupFunctions() {
    const { provider, templates, serverless: { cli } } = this
    const bucket = templates.update.Resources.DeploymentBucket
    const functions = templates.update.Resources.CloudFunctions || []
    const cosBucket = provider.getCOSBucket(bucket)

    const codeObject = {
      cosBucketName: bucket.Bucket, // TODO: scf api append appid?
      cosObjectName: cosBucket.Key,
    }

    return BbPromise.all(functions.map(func => {
      return provider.sdk.scf.requestAsync(_.assign(
        _.pick(func, 'Region', 'functionName'),
        { Action: 'GetFunction' }
      ))
        .catch(err => {
          cli.log('ERROR: Qcloud SCF GetFunction fail!')
          throw err.error
        })
        .then(res => {
          if (res.code !== 0) {
            cli.log(`Creating function "${func.functionName}"...`)
            return provider.sdk.scf.requestAsync(_.assign(
              {},
              func,
              {
                Action: 'CreateFunction',
                Region: func.Region,
                codeObject,
              }
            ))
              .catch(err => {
                cli.log('ERROR: Qcloud SCF CreateFunction fail!')
                throw err.error
              })
              .then(res => {
                if (res.code != 0) {
                  cli.log('ERROR: Qcloud SCF CreateFunction fail!')
                  const error = new Error(res.message)
                  error.name = res.codeDesc
                  throw error
                }
              })
          } else {
            cli.log(`Updating function "${func.functionName}"...`)

            return provider.sdk.scf.requestAsync(_.assign(
              {},
              func,
              {
                Action: 'UpdateFunction',
                codeType: 'Cos',
                codeObject,
              }
            ))
              .catch(err => {
                cli.log('ERROR: Qcloud SCF UpdateFunction fail!')
                throw err.error
              })
              .then(res => console.log(res))
            }
        })
    }))
  }
}
