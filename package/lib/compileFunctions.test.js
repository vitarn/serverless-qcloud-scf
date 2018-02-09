'use strict'

const sinon = require('sinon')

const QcloudProvider = require('../../provider/qcloudProvider')
const QcloudPackage = require('../qcloudPackage')
const Serverless = require('../../test/serverless')

describe('CompileFunctions', () => {
  let serverless
  let qcloudPackage
  let consoleLogStub

  beforeEach(() => {
    serverless = new Serverless()
    serverless.service.service = 'my-service'
    serverless.service.package = {
      artifact: 'artifact.zip',
      artifactDirectoryName: 'some-path',
    }
    serverless.service.provider = {
      compiledConfigurationTemplate: {
        Resources: {
          CloudFunctions: [],
          APIGatewayApis: [],
        },
      },
      deploymentBucket: 'my-bucket',
    }
    serverless.setProvider('qcloud', new QcloudProvider(serverless))
    const options = {
      stage: 'dev',
      region: 'sh',
    }
    qcloudPackage = new QcloudPackage(serverless, options)
    consoleLogStub = sinon.stub(qcloudPackage.serverless.cli, 'log').returns()
  })

  afterEach(() => {
    qcloudPackage.serverless.cli.log.restore()
  })

  describe('#compileFunctions()', () => {
    it('should throw an error if the functions event is not supported', async () => {
      qcloudPackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [
            { invalidEvent: 'event1' },
          ],
        },
      }

      await expect(qcloudPackage.compileFunctions()).rejects.toThrow(Error)
    })

    it('should set the memory size based on the functions configuration', async () => {
      qcloudPackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          memorySize: 768,
          events: [
            { http: 'foo' },
          ],
        },
      }

      await qcloudPackage.compileFunctions()
      
      const { compiledConfigurationTemplate } = qcloudPackage.serverless.service.provider

      expect(compiledConfigurationTemplate.Resources.CloudFunctions[0].memorySize).toBe(768)
    })

    it('should set the memory size based on the provider configuration', async () => {
      qcloudPackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [
            { http: 'foo' },
          ],
        },
      }
      qcloudPackage.serverless.service.provider.memorySize = 768

      const compiledResources = [{
        type: 'cloudfunctions.v1beta2.function',
        name: 'my-service-dev-func1',
        properties: {
          location: 'us-central1',
          function: 'func1',
          availableMemoryMb: 1024,
          timeout: '60s',
          sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
          httpsTrigger: {
            url: 'foo',
          },
        },
      }]

      await qcloudPackage.compileFunctions()

      const { compiledConfigurationTemplate } = qcloudPackage.serverless.service.provider

      expect(compiledConfigurationTemplate.Resources.CloudFunctions[0].memorySize).toBe(768)
    })

    it('should set the timout based on the functions configuration', async () => {
      qcloudPackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          timeout: 119,
          events: [
            { http: 'foo' },
          ],
        },
      }

      await qcloudPackage.compileFunctions()

      const { compiledConfigurationTemplate } = qcloudPackage.serverless.service.provider

      expect(compiledConfigurationTemplate.Resources.CloudFunctions[0].timeout).toBe(119)
    })

    it('should set the timeout based on the provider configuration', async () => {
      qcloudPackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [
            { http: 'foo' },
          ],
        },
      }
      qcloudPackage.serverless.service.provider.timeout = 119

      await qcloudPackage.compileFunctions()

      const { compiledConfigurationTemplate } = qcloudPackage.serverless.service.provider

      expect(compiledConfigurationTemplate.Resources.CloudFunctions[0].timeout).toBe(119)
    })

    it('should compile "http" events properly', async () => {
      qcloudPackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [
            { http: 'foo' },
          ],
        },
      }

      const compiledResources = {
        CloudFunctions:
          [{
            Region: 'sh',
            functionName: 'my-service-dev-func1',
            handler: 'func1',
            runtime: 'Nodejs6.10',
            memorySize: 128,
            timeout: 3,
          }],
        APIGatewayApis:
          [{
            Region: 'sh',
            apiName: 'my-service-dev-func1',
            serviceType: 'SCF',
            serviceTimeout: 3,
            authRequired: 'FALSE',
            requestConfig: {
              method: 'GET',
              path: '/',
            },
            serviceScfFunctionName: 'my-service-dev-func1',
            responseType: 'JSON',
          }]
      }

      await qcloudPackage.compileFunctions()

      const { compiledConfigurationTemplate } = qcloudPackage.serverless.service.provider

      expect(compiledConfigurationTemplate.Resources)
          .toEqual(compiledResources)
    })

    xit('should compile "event" events properly', () => {
      qcloudPackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [
            {
              event: {
                eventType: 'foo',
                path: 'some-path',
                resource: 'some-resource',
              },
            },
          ],
        },
        func2: {
          handler: 'func2',
          events: [
            {
              event: {
                eventType: 'foo',
                resource: 'some-resource',
              },
            },
          ],
        },
      }

      const compiledResources = [
        {
          type: 'cloudfunctions.v1beta2.function',
          name: 'my-service-dev-func1',
          properties: {
            location: 'us-central1',
            function: 'func1',
            availableMemoryMb: 256,
            timeout: '60s',
            sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
            eventTrigger: {
              eventType: 'foo',
              path: 'some-path',
              resource: 'some-resource',
            },
          },
        },
        {
          type: 'cloudfunctions.v1beta2.function',
          name: 'my-service-dev-func2',
          properties: {
            location: 'us-central1',
            function: 'func2',
            availableMemoryMb: 256,
            timeout: '60s',
            sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
            eventTrigger: {
              eventType: 'foo',
              resource: 'some-resource',
            },
          },
        },
      ]

      return qcloudPackage.compileFunctions().then(() => {
        expect(consoleLogStub.called).toEqual(true)
        expect(qcloudPackage.serverless.service.provider.compiledConfigurationTemplate.resources)
          .toEqual(compiledResources)
      })
    })
  })
})
