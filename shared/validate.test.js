'use strict'

const sinon = require('sinon')
const BbPromise = require('bluebird')

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
        .returns(BbPromise.resolve())
      validateServiceNameStub = sinon.stub(qcloudCommand, 'validateServiceName')
        .returns(BbPromise.resolve())
      validateFunctionNamesStub = sinon.stub(qcloudCommand, 'validateFunctionNames')
        .returns(BbPromise.resolve())
      validateHandlersStub = sinon.stub(qcloudCommand, 'validateHandlers')
        .returns(BbPromise.resolve())
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
    it('should throw an errir if missing handler', () => {
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
})
