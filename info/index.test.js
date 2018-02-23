'use strict'

const sinon = require('sinon')
const QcloudInfo = require('./index')
const QcloudProvider = require('../provider/qcloudProvider')
const Serverless = require('../test/serverless')

xdescribe('QcloudInfo', () => {
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
      log: sinon.stub().returns(),
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
    it('should have hooks', () => expect(qcloudInfo.hooks).to.be.not.empty)

    it('should set the provider variable to the QcloudProvider instance', () =>
      expect(qcloudInfo.provider).to.be.instanceof(QcloudProvider))

    it('should set an empty options object if no options are given', () => {
      const qcloudInfoWithEmptyOptions = new QcloudInfo(serverless)

      expect(qcloudInfoWithEmptyOptions.options).to.deep.equal({})
    })

    it('should run promise chain in order for "info:info" hook', () =>
      qcloudInfo.hooks['info:info']().then(() => {
        expect(validateStub.calledOnce).to.equal(true)
        expect(getStackInfoStub.calledAfter(validateStub)).to.equal(true)
        expect(displayServiceInfoStub.calledAfter(getApiKeyValuesStub)).to.equal(true)
        expect(displayApiKeysStub.calledAfter(getApiKeyValuesStub)).to.equal(true)
        expect(displayEndpointsStub.calledAfter(getApiKeyValuesStub)).to.equal(true)
        expect(displayFunctionsStub.calledAfter(getApiKeyValuesStub)).to.equal(true)
        expect(displayStackOutputsStub.calledAfter(getApiKeyValuesStub)).to.equal(true)
      })
    )

    describe('when running "deploy:deploy" hook', () => {
      it('should run promise chain in order if no deploy is not set', () =>
        qcloudInfo.hooks['deploy:deploy']().then(() => {
          expect(validateStub.calledOnce).to.equal(true)
          expect(getStackInfoStub.calledAfter(validateStub)).to.equal(true)
          expect(displayServiceInfoStub.calledAfter(getApiKeyValuesStub)).to.equal(true)
          expect(displayApiKeysStub.calledAfter(getApiKeyValuesStub)).to.equal(true)
          expect(displayEndpointsStub.calledAfter(getApiKeyValuesStub)).to.equal(true)
          expect(displayFunctionsStub.calledAfter(getApiKeyValuesStub)).to.equal(true)
          expect(displayStackOutputsStub.calledAfter(getApiKeyValuesStub)).to.equal(true)
        })
      )
    })
  })
})
