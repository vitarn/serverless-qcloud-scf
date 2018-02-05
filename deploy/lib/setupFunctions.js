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
      cosBucketName: cosBucket.Bucket,
      cosObjectName: ''
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
          if (res.code == 0) {
            cli.log(`Update function ${func.functionName}...`)

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
                cli.log('ERROR: Qcloud SCF CreateFunction fail!')
                throw err.error
              })
              .then(res => console.log(res))
          }

          cli.log(`Create function ${func.functionName}...`)
          return provider.sdk.scf.requestAsync(_.assign(
            {},
            func,
            {
              Action: 'CreateFunction',
              codeObject,
            }
          ))
            .catch(err => {
              cli.log('ERROR: Qcloud SCF CreateFunction fail!')
              throw err.error
            })
            .then(res => console.log(res))
        })
    }))
  }
}
