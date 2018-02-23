'use strict'

const sinon = require('sinon')
const QcloudInfo = require('./index')
const QcloudProvider = require('../provider/qcloudProvider')
const Serverless = require('../test/serverless')

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

  it('should resolve if AWS does not return API key values', () => {
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
