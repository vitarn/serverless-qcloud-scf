import sinon from 'sinon'
import chalk from 'chalk'
import { QcloudInfo } from './info'
import { QcloudProvider } from './provider'
import { Serverless } from './test/serverless'

describe('QcloudInfo', () => {
  xdescribe('index', () => {
    let serverless
    let qcloudInfo
    let validateStub
    let getStackInfoStub
    let getApiKeyValuesStub
    let displayServiceInfoStub
    let displayApiKeysStub
    let displayEndpointsStub
    let displayFunctionsStub
    let displayStackOutputsStub

    beforeEach(() => {
      const options = {
        stage: 'dev',
        region: 'sh',
      }
      serverless = new Serverless()
      serverless.setProvider('qcloud', new QcloudProvider(serverless, options))
      serverless.cli = {
        log: sinon.stub().returns({}),
      }
      qcloudInfo = new QcloudInfo(serverless, options)
      // Load commands and hooks into pluginManager
      serverless.pluginManager.loadCommands(qcloudInfo)
      serverless.pluginManager.loadHooks(qcloudInfo)
      validateStub = sinon
        .stub(qcloudInfo, 'validate').resolves()
      getStackInfoStub = sinon
        .stub(qcloudInfo, 'getStackInfo').resolves()
      getApiKeyValuesStub = sinon
        .stub(qcloudInfo, 'getApiKeyValues').resolves()
      displayServiceInfoStub = sinon
        .stub(qcloudInfo, 'displayServiceInfo').resolves()
      displayApiKeysStub = sinon
        .stub(qcloudInfo, 'displayApiKeys').resolves()
      displayEndpointsStub = sinon
        .stub(qcloudInfo, 'displayEndpoints').resolves()
      displayFunctionsStub = sinon
        .stub(qcloudInfo, 'displayFunctions').resolves()
      displayStackOutputsStub = sinon
        .stub(qcloudInfo, 'displayStackOutputs').resolves()
    })

    afterEach(() => {
      qcloudInfo.validate.restore()
      qcloudInfo.getStackInfo.restore()
      qcloudInfo.getApiKeyValues.restore()
      qcloudInfo.displayServiceInfo.restore()
      qcloudInfo.displayApiKeys.restore()
      qcloudInfo.displayEndpoints.restore()
      qcloudInfo.displayFunctions.restore()
      qcloudInfo.displayStackOutputs.restore()
    })

    describe('#constructor()', () => {
      it('should have hooks', () => expect(qcloudInfo.hooks).toBeTruthy())

      it('should set the provider variable to the QcloudProvider instance', () =>
        expect(qcloudInfo.provider).toBeInstanceOf(QcloudProvider))

      it('should set an empty options object if no options are given', () => {
        const qcloudInfoWithEmptyOptions = new QcloudInfo(serverless)

        expect(qcloudInfoWithEmptyOptions.options).toEqual({})
      })

      it('should run promise chain in order for "info:info" hook', () =>
        qcloudInfo.hooks['info:info']().then(() => {
          expect(validateStub.calledOnce).toBe(true)
          expect(getStackInfoStub.calledAfter(validateStub)).toBe(true)
          expect(displayServiceInfoStub.calledAfter(getApiKeyValuesStub)).toBe(true)
          expect(displayApiKeysStub.calledAfter(getApiKeyValuesStub)).toBe(true)
          expect(displayEndpointsStub.calledAfter(getApiKeyValuesStub)).toBe(true)
          expect(displayFunctionsStub.calledAfter(getApiKeyValuesStub)).toBe(true)
          expect(displayStackOutputsStub.calledAfter(getApiKeyValuesStub)).toBe(true)
        })
      )

      describe('when running "deploy:deploy" hook', () => {
        it('should run promise chain in order if no deploy is not set', () =>
          qcloudInfo.hooks['deploy:deploy']().then(() => {
            expect(validateStub.calledOnce).toBe(true)
            expect(getStackInfoStub.calledAfter(validateStub)).toBe(true)
            expect(displayServiceInfoStub.calledAfter(getApiKeyValuesStub)).toBe(true)
            expect(displayApiKeysStub.calledAfter(getApiKeyValuesStub)).toBe(true)
            expect(displayEndpointsStub.calledAfter(getApiKeyValuesStub)).toBe(true)
            expect(displayFunctionsStub.calledAfter(getApiKeyValuesStub)).toBe(true)
            expect(displayStackOutputsStub.calledAfter(getApiKeyValuesStub)).toBe(true)
          })
        )
      })
    })
  })

  describe('#display()', () => {
    let serverless
    let qcloudInfo
    let consoleLogStub

    beforeEach(() => {
      const options = {
        stage: 'dev',
        region: 'sh',
      }
      serverless = new Serverless()
      serverless.setProvider('qcloud', new QcloudProvider(serverless, options))
      serverless.service.service = 'my-service'
      qcloudInfo = new QcloudInfo(serverless, options)
      qcloudInfo.gatheredData = {
        info: {
          service: 'my-first',
          stage: 'dev',
          region: 'sh',
          endpoint: null,
          functions: [],
          apiKeys: [],
        },
      }
      consoleLogStub = sinon.stub(serverless.cli, 'consoleLog').returns({})
    })

    afterEach(() => {
      serverless.cli.consoleLog.restore()
    })

    it('should display general service info', () => {
      let expectedMessage = ''

      expectedMessage += `${chalk.yellow.underline('Service Information')}\n`
      expectedMessage += `${chalk.yellow('service:')} my-first\n`
      expectedMessage += `${chalk.yellow('stage:')} dev\n`
      expectedMessage += `${chalk.yellow('region:')} sh`

      const message = qcloudInfo.displayServiceInfo()
      expect(consoleLogStub.calledOnce).toBe(true)
      expect(message).toBe(expectedMessage)
    })

    it('should display API keys if given', () => {
      qcloudInfo.gatheredData.info.apiKeys = [{ name: 'keyOne', value: '1234' }]

      let expectedMessage = ''

      expectedMessage += `${chalk.yellow('api keys:')}`
      expectedMessage += '\n  keyOne: 1234'

      const message = qcloudInfo.displayApiKeys()
      expect(consoleLogStub.calledOnce).toBe(true)
      expect(message).toBe(expectedMessage)

      delete qcloudInfo.gatheredData.info.apiKeys
      const missingMessage = qcloudInfo.displayApiKeys()
      expectedMessage = `${chalk.yellow('api keys:')}`
      expectedMessage += '\n  None'
      expect(missingMessage).toBe(expectedMessage)
    })

    it('should hide API keys values when `--conceal` is given', () => {
      qcloudInfo.options.conceal = true
      qcloudInfo.gatheredData.info.apiKeys = [{ name: 'keyOne', value: '1234' }]

      let expectedMessage = ''

      expectedMessage += `${chalk.yellow('api keys:')}`
      expectedMessage += '\n  keyOne'

      const message = qcloudInfo.displayApiKeys()
      expect(consoleLogStub.calledOnce).toBe(true)
      expect(message).toBe(expectedMessage)
    })

    it('should display endpoints if given', () => {
      qcloudInfo.serverless.service.functions = {
        function1: {
          events: [
            {
              http: {
                path: '/',
                method: 'POST',
              },
            },
            {
              http: {
                path: '/both/',
                method: 'POST',
              },
            },
            {
              http: {
                path: '/both/add/',
                method: 'POST',
              },
            },
            {
              http: {
                path: 'e',
                method: 'POST',
              },
            },
          ],
        },
        function2: {
          events: [
            {
              http: 'GET function1',
            },
          ],
        },
        function3: {
          events: [
            {
              s3: 'used-to-trigger-if',
            },
          ],
        },
      }

      qcloudInfo.gatheredData.info.endpoint = 'service-abcdefgh-1257654321.ap-beijing.apigateway.myqcloud.com/test'

      let expectedMessage = ''

      expectedMessage += `${chalk.yellow('endpoints:')}`
      expectedMessage += '\n  POST - service-abcdefgh-1257654321.ap-beijing.apigateway.myqcloud.com/test'
      expectedMessage += '\n  POST - service-abcdefgh-1257654321.ap-beijing.apigateway.myqcloud.com/test/both'
      expectedMessage += '\n  POST - service-abcdefgh-1257654321.ap-beijing.apigateway.myqcloud.com/test/both/add'
      expectedMessage += '\n  POST - service-abcdefgh-1257654321.ap-beijing.apigateway.myqcloud.com/test/e'
      expectedMessage += '\n  GET - service-abcdefgh-1257654321.ap-beijing.apigateway.myqcloud.com/test/function1'

      const message = qcloudInfo.displayEndpoints()
      expect(consoleLogStub.calledOnce).toBe(true)
      expect(message).toBe(expectedMessage)

      delete qcloudInfo.gatheredData.info.endpoint
      const missingMessage = qcloudInfo.displayEndpoints()
      expectedMessage = `${chalk.yellow('endpoints:')}`
      expectedMessage += '\n  None'
      expect(missingMessage).toBe(expectedMessage)
    })

    it('should display functions if given', () => {
      qcloudInfo.gatheredData.info.functions = [
        {
          name: 'function1',
          deployedName: 'my-first-dev-function1',
        },
        {
          name: 'function2',
          deployedName: 'my-first-dev-function2',
        },
        {
          name: 'function3',
          deployedName: 'my-first-dev-function3',
        },
      ]

      let expectedMessage = ''

      expectedMessage += `${chalk.yellow('functions:')}`
      expectedMessage += '\n  function1: my-first-dev-function1'
      expectedMessage += '\n  function2: my-first-dev-function2'
      expectedMessage += '\n  function3: my-first-dev-function3'

      const message = qcloudInfo.displayFunctions()
      expect(consoleLogStub.calledOnce).toBe(true)
      expect(message).toBe(expectedMessage)

      delete qcloudInfo.gatheredData.info.functions
      const missingMessage = qcloudInfo.displayFunctions()
      expectedMessage = `${chalk.yellow('functions:')}`
      expectedMessage += '\n  None'
      expect(missingMessage).toBe(expectedMessage)
    })
  })

  xdescribe('#getApiKeyValues()', () => {
    let serverless
    let qcloudInfo
    let requestStub

    beforeEach(() => {
      const options = {
        stage: 'dev',
        region: 'sh',
      }
      serverless = new Serverless()
      serverless.setProvider('qcloud', new QcloudProvider(serverless, options))
      serverless.service.service = 'my-service'
      qcloudInfo = new QcloudInfo(serverless, options)
      requestStub = sinon.stub(qcloudInfo.provider, 'request')
    })

    afterEach(() => {
      qcloudInfo.provider.request.restore()
    })

    it('should add API Key values to this.gatheredData if API key names are available', () => {
      // set the API Keys for the service
      qcloudInfo.serverless.service.provider.apiKeys = ['foo', 'bar']

      qcloudInfo.gatheredData = {
        info: {},
      }

      const apiKeyItems = {
        items: [
          {
            id: '4711',
            name: 'SomeRandomIdInUsersAccount',
            value: 'ShouldNotBeConsidered',
          },
          {
            id: '1234',
            name: 'foo',
            value: 'valueForKeyFoo',
          },
          {
            id: '5678',
            name: 'bar',
            value: 'valueForKeyBar',
          },
        ],
      }

      requestStub.resolves(apiKeyItems)

      const expectedGatheredDataObj = {
        info: {
          apiKeys: [
            {
              name: 'foo',
              value: 'valueForKeyFoo',
            },
            {
              name: 'bar',
              value: 'valueForKeyBar',
            },
          ],
        },
      }

      return qcloudInfo.getApiKeyValues().then(() => {
        expect(requestStub.calledOnce).toBe(true)
        expect(qcloudInfo.gatheredData).toEqual(expectedGatheredDataObj)
      })
    })

    it('should resolve if Qcloud does not return API key values', () => {
      // set the API Keys for the service
      qcloudInfo.serverless.service.provider.apiKeys = ['foo', 'bar']

      qcloudInfo.gatheredData = {
        info: {},
      }

      const apiKeyItems = {
        items: [],
      }

      requestStub.resolves(apiKeyItems)

      const expectedGatheredDataObj = {
        info: {
          apiKeys: [],
        },
      }

      return qcloudInfo.getApiKeyValues().then(() => {
        expect(requestStub.calledOnce).toBe(true)
        expect(qcloudInfo.gatheredData).toEqual(expectedGatheredDataObj)
      })
    })

    it('should resolve if API key names are not available', () => {
      qcloudInfo.serverless.service.provider.apiKeys = null

      qcloudInfo.gatheredData = {
        info: {},
      }

      const expectedGatheredDataObj = {
        info: {
          apiKeys: [],
        },
      }

      return qcloudInfo.getApiKeyValues().then(() => {
        expect(requestStub.calledOnce).toBe(false)
        expect(qcloudInfo.gatheredData).toEqual(expectedGatheredDataObj)
      })
    })
  })

  xdescribe('#getStackInfo()', () => {
    let serverless
    let qcloudInfo
    let describeStacksStub

    beforeEach(() => {
      const options = {
        stage: 'dev',
        region: 'sh',
      }
      serverless = new Serverless()
      serverless.setProvider('aws', new QcloudProvider(serverless, options))
      serverless.service.service = 'my-service'
      serverless.service.functions = {
        hello: {},
        world: {},
      }
      qcloudInfo = new QcloudInfo(serverless, options)

      describeStacksStub = sinon.stub(qcloudInfo.provider, 'request')
    })

    afterEach(() => {
      qcloudInfo.provider.request.restore()
    })

    it('attach info from describeStack call to this.gatheredData if result is available', () => {
      const describeStacksResponse = {
        Stacks: [
          {
            StackId: 'arn:aws:cloudformation:us-east-1:123456789012:' +
              'stack/myteststack/466df9e0-0dff-08e3-8e2f-5088487c4896',
            Description: 'AWS CloudFormation Sample Template S3_Bucket: ' +
              'Sample template showing how to create a publicly accessible S3 bucket.',
            Tags: [],
            Outputs: [
              {
                Description: 'URL of the service endpoint',
                OutputKey: 'ServiceEndpoint',
                OutputValue: 'ab12cd34ef.execute-api.us-east-1.amazonaws.com/dev',
              },
              {
                Description: 'first',
                OutputKey: 'ApiGatewayApiKey1Value',
                OutputValue: 'xxx',
              },
              {
                Description: 'second',
                OutputKey: 'ApiGatewayApiKey2Value',
                OutputValue: 'yyy',
              },
            ],
            StackStatusReason: null,
            CreationTime: '2013-08-23T01:02:15.422Z',
            Capabilities: [],
            StackName: 'myteststack',
            StackStatus: 'CREATE_COMPLETE',
            DisableRollback: false,
          },
        ],
      }

      describeStacksStub.resolves(describeStacksResponse)

      const expectedGatheredDataObj = {
        info: {
          functions: [
            {
              name: 'hello',
              deployedName: 'my-service-dev-hello',
            },
            {
              name: 'world',
              deployedName: 'my-service-dev-world',
            },
          ],
          endpoint: 'ab12cd34ef.execute-api.us-east-1.amazonaws.com/dev',
          service: 'my-service',
          stage: 'dev',
          region: 'us-east-1',
          stack: 'my-service-dev',
        },
        outputs: [
          {
            Description: 'URL of the service endpoint',
            OutputKey: 'ServiceEndpoint',
            OutputValue: 'ab12cd34ef.execute-api.us-east-1.amazonaws.com/dev',
          },
          {
            Description: 'first',
            OutputKey: 'ApiGatewayApiKey1Value',
            OutputValue: 'xxx',
          },
          {
            Description: 'second',
            OutputKey: 'ApiGatewayApiKey2Value',
            OutputValue: 'yyy',
          },
        ],
      }

      return qcloudInfo.getStackInfo().then(() => {
        expect(describeStacksStub.calledOnce).toBe(true)
        expect(describeStacksStub.calledWithExactly(
          'CloudFormation',
          'describeStacks',
          {
            StackName: qcloudInfo.provider.naming.getStackName(),
          }
        )).toBe(true)

        expect(qcloudInfo.gatheredData).toEqual(expectedGatheredDataObj)
      })
    })

    it('should resolve if result is empty', () => {
      const describeStacksResponse = null

      describeStacksStub.resolves(describeStacksResponse)

      const expectedGatheredDataObj = {
        info: {
          functions: [],
          endpoint: '',
          service: 'my-service',
          stage: 'dev',
          region: 'us-east-1',
          stack: 'my-service-dev',
        },
        outputs: [],
      }

      return qcloudInfo.getStackInfo().then(() => {
        expect(describeStacksStub.calledOnce).toBe(true)
        expect(describeStacksStub.calledWithExactly(
          'CloudFormation',
          'describeStacks',
          {
            StackName: qcloudInfo.provider.naming.getStackName(),
          }
        )).toBe(true)

        expect(qcloudInfo.gatheredData).toEqual(expectedGatheredDataObj)
      })
    })
  })

  xdescribe('#getApiKeyValues()', () => {
    let serverless
    let qcloudInfo
    let requestStub

    beforeEach(() => {
      const options = {
        stage: 'dev',
        region: 'sh',
      }
      serverless = new Serverless()
      serverless.setProvider('qcloud', new QcloudProvider(serverless, options))
      serverless.service.service = 'my-service'
      qcloudInfo = new QcloudInfo(serverless, options)
      requestStub = sinon.stub(qcloudInfo.provider, 'request')
    })

    afterEach(() => {
      qcloudInfo.provider.request.restore()
    })

    it('should add API Key values to this.gatheredData if API key names are available', () => {
      // set the API Keys for the service
      qcloudInfo.serverless.service.provider.apiKeys = ['foo', 'bar']

      qcloudInfo.gatheredData = {
        info: {},
      }

      const apiKeyItems = {
        items: [
          {
            id: '4711',
            name: 'SomeRandomIdInUsersAccount',
            value: 'ShouldNotBeConsidered',
          },
          {
            id: '1234',
            name: 'foo',
            value: 'valueForKeyFoo',
          },
          {
            id: '5678',
            name: 'bar',
            value: 'valueForKeyBar',
          },
        ],
      }

      requestStub.resolves(apiKeyItems)

      const expectedGatheredDataObj = {
        info: {
          apiKeys: [
            {
              name: 'foo',
              value: 'valueForKeyFoo',
            },
            {
              name: 'bar',
              value: 'valueForKeyBar',
            },
          ],
        },
      }

      return qcloudInfo.getApiKeyValues().then(() => {
        expect(requestStub.calledOnce).toBe(true)
        expect(qcloudInfo.gatheredData).toEqual(expectedGatheredDataObj)
      })
    })

    it('should resolve if Qcloud does not return API key values', () => {
      // set the API Keys for the service
      qcloudInfo.serverless.service.provider.apiKeys = ['foo', 'bar']

      qcloudInfo.gatheredData = {
        info: {},
      }

      const apiKeyItems = {
        items: [],
      }

      requestStub.resolves(apiKeyItems)

      const expectedGatheredDataObj = {
        info: {
          apiKeys: [],
        },
      }

      return qcloudInfo.getApiKeyValues().then(() => {
        expect(requestStub.calledOnce).toBe(true)
        expect(qcloudInfo.gatheredData).toEqual(expectedGatheredDataObj)
      })
    })

    it('should resolve if API key names are not available', () => {
      qcloudInfo.serverless.service.provider.apiKeys = null

      qcloudInfo.gatheredData = {
        info: {},
      }

      const expectedGatheredDataObj = {
        info: {
          apiKeys: [],
        },
      }

      return qcloudInfo.getApiKeyValues().then(() => {
        expect(requestStub.calledOnce).toBe(false)
        expect(qcloudInfo.gatheredData).toEqual(expectedGatheredDataObj)
      })
    })
  })
})
