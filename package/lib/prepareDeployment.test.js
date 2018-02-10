'use strict'

const sinon = require('sinon')

const QcloudProvider = require('../../provider/qcloudProvider')
const QcloudPackage = require('../qcloudPackage')
const Serverless = require('../../test/serverless')

describe('PrepareDeployment', () => {
  let coreResources
  let serverless
  let qcloudPackage

  beforeEach(() => {
    coreResources = {
      Resources: {},
    }
    serverless = new Serverless()
    serverless.service.service = 'my-service'
    serverless.service.provider = {
      compiledConfigurationTemplate: coreResources,
      deploymentBucket: 'my-bucket',
    }
    const options = {
      stage: 'dev',
      region: 'sh',
    }
    serverless.setProvider('qcloud', new QcloudProvider(serverless, options))
    qcloudPackage = new QcloudPackage(serverless, options)
  })

  describe('#prepareDeployment()', () => {
    let readFileSyncStub

    beforeEach(() => {
      readFileSyncStub = sinon.stub(serverless.utils, 'readFileSync').returns(coreResources)
    })

    afterEach(() => {
      serverless.utils.readFileSync.restore()
    })

    it('should load the core configuration template into the serverless instance', async () => {
      const expectedCompiledConfiguration = {
        Resources: {
          DeploymentBucket: {
            Bucket: 'my-bucket',
            Region: 'sh',
            ACL: 'public-read',
          },
          CloudFunctions: [],
          APIGateway: {},
          APIGatewayApis: [],
        },
      }

      await qcloudPackage.prepareDeployment()

      expect(readFileSyncStub.calledOnce).toEqual(true)
      expect(serverless.service.provider.compiledConfigurationTemplate).toEqual(expectedCompiledConfiguration)
    })
  })
})
