'use strict'

const fs = require('fs')
const sinon = require('sinon')

const QcloudProvider = require('../../provider/qcloudProvider')
const QcloudPackage = require('../qcloudPackage')
const Serverless = require('../../test/serverless')

describe('GenerateArtifactDirectoryName', () => {
  let serverless
  let qcloudPackage
  let statSyncStub

  beforeEach(() => {
    serverless = new Serverless()
    serverless.service.service = 'my-service'
    serverless.service.provider = {
      compiledConfigurationTemplate: {
        Resources: {
          DeploymentBucket: {},
        },
      },
    }
    serverless.service.package = {
      artifact: 'my-code.zip',
    }
    serverless.setProvider('qcloud', new QcloudProvider(serverless))
    const options = {
      stage: 'dev',
      region: 'sh',
    }
    qcloudPackage = new QcloudPackage(serverless, options)
    statSyncStub = sinon.stub(fs, 'statSync').returns({ size: 99 })
  })

  afterEach(() => {
    statSyncStub.restore()
  })

  it('should create a valid artifact directory name', async () => {
    await qcloudPackage.generateArtifactDirectoryName()

    const { DeploymentBucket } = serverless.service.provider.compiledConfigurationTemplate.Resources

    expect(DeploymentBucket.Key).toMatch(/my-service\/dev\/.+\/my-code\.zip/)
    expect(DeploymentBucket.Body).toBe('my-code.zip')
    expect(DeploymentBucket.ContentLength).toBe(99)
  })
})
