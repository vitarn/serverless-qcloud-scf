'use strict'

const fs = require('fs')

module.exports = {
  uploadArtifacts() {
    const { templates, provider, serverless: { cli } } = this

    const bucket = templates.update.Resources.DeploymentBucket
    const cosBucket = provider.getCOSBucket(bucket)

    cosBucket.Body = fs.createReadStream(cosBucket.Body)

    cli.log(`Uploading ${bucket.Key} to OSS bucket ${bucket.Bucket}...`)
    return provider.sdk.cos.putObjectAsync(cosBucket)
      .catch(err => {
        cli.log('ERROR Qcloud COS putObject fail')
        throw err.error
      })
      .then(() => {
        cli.log(`Uploaded ${bucket.Key} to OSS bucket ${bucket.Bucket}`)
      })
  },
}
