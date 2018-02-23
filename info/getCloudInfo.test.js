'use strict'

const sinon = require('sinon')
const QcloudInfo = require('./index')
const QcloudProvider = require('../provider/qcloudProvider')
const Serverless = require('../test/serverless')

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
