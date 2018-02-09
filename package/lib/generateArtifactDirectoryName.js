'use strict'

const path = require('path')
const fs = require('fs')
const _ = require('lodash')

module.exports = {
  async generateArtifactDirectoryName() {
    const { options, serverless: { service } } = this
    const date = new Date()
    const serviceWithStage = `${service.service}/${options.stage || 'dev'}`
    const dateString = `${date.getTime().toString()}-${date.toISOString()}`
    const fileName = service.package.artifact.split(path.sep).pop()
    const { DeploymentBucket } = service.provider.compiledConfigurationTemplate.Resources

    _.assign(
      service.provider.compiledConfigurationTemplate.Resources.DeploymentBucket,
      {
        Key: `${serviceWithStage}/${dateString}/${fileName}`,
        Body: service.package.artifact,
        ContentLength: fs.statSync(service.package.artifact).size,
      }
    )
  },
}
