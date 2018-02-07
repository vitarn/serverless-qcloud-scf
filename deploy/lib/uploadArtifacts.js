'use strict'

const fs = require('fs')

module.exports = {
  uploadArtifacts() {
    const { templates, provider, serverless: { cli } } = this
    const api = provider.sdk.cos
    const bucket = templates.update.Resources.DeploymentBucket
    const cosBucket = provider.getCOSBucket(bucket)

    cosBucket.Body = fs.createReadStream(cosBucket.Body)

    cli.log(`Uploading "${bucket.Key}" to OSS bucket "${bucket.Bucket}"...`)

    return api.putObjectAsync(cosBucket)
  },
}
