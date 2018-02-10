'use strict'

const path = require('path')
const fs = require('fs')
const _ = require('lodash')

module.exports = {
  async generateArtifactDirectoryName() {
    const { provider, serverless: { service } } = this
    const date = new Date()
    const dateString = `${date.getTime().toString()}-${date.toISOString()}`
    const fileName = service.package.artifact.split(path.sep).pop()
    const { DeploymentBucket } = service.provider.compiledConfigurationTemplate.Resources

    _.assign(
      service.provider.compiledConfigurationTemplate.Resources.DeploymentBucket,
      {
        Key: `${provider.artifactDirectoryPrefix}/${dateString}/${fileName}`,
        Body: service.package.artifact,
        ContentLength: fs.statSync(service.package.artifact).size,
      }
    )
  },
}
