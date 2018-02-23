'use strict'

const sinon = require('sinon')
const QcloudInfo = require('./index')
const QcloudProvider = require('../provider/qcloudProvider')
const Serverless = require('../test/serverless')
const chalk = require('chalk')

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
    consoleLogStub = sinon.stub(serverless.cli, 'consoleLog').returns()
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
