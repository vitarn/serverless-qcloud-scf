'use strict'

const sinon = require('sinon')

const validate = require('./validate')
const QcloudProvider = require('../provider/qcloudProvider')
const Serverless = require('../test/serverless')
const QcloudCommand = require('../test/qcloudCommand')

describe('Validate', () => {
  let serverless
  let qcloudCommand

  beforeEach(() => {
    serverless = new Serverless()
    serverless.config = {
      servicePath: true,
    }
    serverless.service = {
      service: 'some-default-service',
    }
    serverless.setProvider('qcloud', new QcloudProvider(serverless))
    qcloudCommand = new QcloudCommand(serverless, {}, validate)
  })

  describe('#validate()', () => {
    let validateServicePathStub
    let validateServiceNameStub
    let validateFunctionNamesStub
    let validateHandlersStub

    beforeEach(() => {
      validateServicePathStub = sinon.stub(qcloudCommand, 'validateServicePath')
        .returns()
      validateServiceNameStub = sinon.stub(qcloudCommand, 'validateServiceName')
        .returns()
      validateFunctionNamesStub = sinon.stub(qcloudCommand, 'validateFunctionNames')
        .returns()
      validateHandlersStub = sinon.stub(qcloudCommand, 'validateHandlers')
        .returns()
    })

    afterEach(() => {
      qcloudCommand.validateServicePath.restore()
      qcloudCommand.validateServiceName.restore()
      qcloudCommand.validateFunctionNames.restore()
      qcloudCommand.validateHandlers.restore()
    })

    it('should run promise chain', () => qcloudCommand
      .validate().then(() => {
        expect(validateServicePathStub.calledOnce).toEqual(true)
        expect(validateServiceNameStub.calledAfter(validateServicePathStub))
        expect(validateFunctionNamesStub.calledAfter(validateServiceNameStub))
        expect(validateHandlersStub.calledAfter(validateFunctionNamesStub))
      }))
  })

  describe('#validateServicePath()', () => {
    it('should throw an error if not inside service', () => {
      serverless.config.servicePath = false

      expect(() => qcloudCommand.validateServicePath()).toThrow(Error)
    })

    it('should not throw an error if inside service', () => {
      serverless.config.servicePath = true

      expect(() => qcloudCommand.validateServicePath()).not.toThrow(Error)
    })
  })

  describe('#validateServiceName()', () => {
    it('should throw an error if the service name longer than 60', () => {
      serverless.service.service = 's'.repeat(61)

      expect(() => qcloudCommand.validateServiceName()).toThrow(Error)
    })

    it('should throw an error if the service name not start with letter', () => {
      serverless.service.service = '163'

      expect(() => qcloudCommand.validateServiceName()).toThrow(Error)
    })

    it('should not throw an error if the service name is valid', () => {
      serverless.service.service = 'service-name'

      expect(() => qcloudCommand.validateServiceName()).not.toThrow(Error)
    })
  })

  describe('#validateAPIGatewayServiceName', () => {
    it('should throw an error if api gateway service name longer than 50', () => {
      serverless.service.provider = { apiGateway: { name: 's'.repeat(51) } }

      expect(() => qcloudCommand.validateAPIGatewayServiceName()).toThrow(Error)
    })

    it('should throw an error if the function name contains an invalid character', () => {
      serverless.service.provider = { apiGateway: { name: 'my-api-group' } }

      expect(() => qcloudCommand.validateAPIGatewayServiceName()).toThrow(Error)
    })

    it('should not throw an error if the service name is valid', () => {
      serverless.service.provider = { apiGateway: { name: 'my_api_group' } }

      expect(() => qcloudCommand.validateAPIGatewayServiceName()).not.toThrow(Error)
    })
  })

  describe('#validateFunctionNames()', () => {
    it('should throw an errir if the function name long than 60', () => {
      qcloudCommand.serverless.service.functions = {
        ['s'.repeat(61)]: {}
      }

      expect(() => qcloudCommand.validateFunctionNames()).toThrow(Error)
    })

    it('should throw an errir if the function name not starts with letter', () => {
      qcloudCommand.serverless.service.functions = {
        '163': {}
      }

      expect(() => qcloudCommand.validateFunctionNames()).toThrow(Error)
    })

    it('should throw an error if the function name contains an invalid character', () => {
      qcloudCommand.serverless.service.functions = {
        'invalid/handler': {}
      }

      expect(() => qcloudCommand.validateFunctionNames()).toThrow(Error)
    })

    it('should not throw an error if the function name is valid', () => {
      qcloudCommand.serverless.service.functions = {
        foo: {},
      }

      expect(() => qcloudCommand.validateFunctionNames()).not.toThrow(Error)
    })
  })

  describe('#validateHandlers()', () => {
    it('should throw an error if missing handler', () => {
      qcloudCommand.serverless.service.functions = {
        foo: {}
      }

      expect(() => qcloudCommand.validateHandlers()).toThrow(Error)
    })

    it('should not throw an error if the function handler is valid', () => {
      qcloudCommand.serverless.service.functions = {
        foo: {
          handler: 'valid.handler',
        },
      }

      expect(() => qcloudCommand.validateHandlers()).not.toThrow(Error)
    })
  })

  describe('#validateFunctionDescriptions()', () => {
    it('should throw an error if function description long than 1000', () => {
      qcloudCommand.serverless.service.functions = {
        foo: {
          description: 'f'.repeat(1001)
        }
      }

      expect(() => qcloudCommand.validateFunctionDescriptions()).toThrow(Error)
    })
    
    it('should throw an error if function description is invalid', () => {
      qcloudCommand.serverless.service.functions = {
        foo: {
          description: 'f-n'
        }
      }

      expect(() => qcloudCommand.validateFunctionDescriptions()).toThrow(Error)
    })

    it('should throw an error if function description contains Chinese', () => {
      qcloudCommand.serverless.service.functions = {
        foo: {
          description: '汉'
        }
      }

      expect(() => qcloudCommand.validateFunctionDescriptions()).toThrow(Error)
    })

    it('should not throw if function description is valid', () => {
      qcloudCommand.serverless.service.functions = {
        foo: {
          description: 'This is my first cloud function, I wish everyone goes well.'
        }
      }

      expect(() => qcloudCommand.validateFunctionDescriptions()).not.toThrow(Error)
    })
  })
})
