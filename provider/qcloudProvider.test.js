'use strict'

const fs = require('fs')
const os = require('os')

const sinon = require('sinon')
const QcloudApi = require('qcloudapi-sdk')

const QcloudProvider = require('./qcloudProvider')
const Serverless = require('../test/serverless')

describe('QcloudProvider', () => {
  let readFileSyncStub
  let qcloudProvider
  let serverless
  let setProviderStub
  let homedirStub

  beforeEach(() => {
    serverless = new Serverless()
    serverless.service = {
      provider: {
        project: 'example-project',
        credentials: '/root/.qcloudcli/credentials',
      },
    }
    setProviderStub = sinon.stub(serverless, 'setProvider').returns()
    readFileSyncStub = sinon.stub(fs, 'readFileSync')
      .returns('[default]\nqcloud_secretkey = mykey\nqcloud_secretid = myid')
    homedirStub = sinon.stub(os, 'homedir')
      .returns('/root')
    qcloudProvider = new QcloudProvider(serverless)
  })

  afterEach(() => {
    serverless.setProvider.restore()
    fs.readFileSync.restore()
    os.homedir.restore()
  })

  describe('#getProviderName()', () => {
    it('should return the provider name', () => {
      expect(QcloudProvider.getProviderName()).toEqual('qcloud')
    })
  })

  describe('#constructor()', () => {
    it('should store an instance of serverless', () => {
      expect(qcloudProvider.serverless).toBeInstanceOf(Serverless)
    })

    it('should store an instance of itself', () => {
      expect(qcloudProvider.provider).toBeInstanceOf(QcloudProvider)
    })

    it('should set the provider with the Serverless instance', () => {
      expect(setProviderStub.calledOnce).toEqual(true)
    })

    it('should set the used SDKs', () => {
      expect(qcloudProvider.sdk.scf)
        .toBeDefined()
      expect(qcloudProvider.sdk.apigateway)
        .toBeDefined()
      expect(qcloudProvider.sdk.cos)
        .toBeDefined()
      expect(qcloudProvider.sdk.cls)
        .toBeDefined()
    })
  })

  describe('#isServiceSupported()', () => {
    it('should do nothing if service is available', () => {
      expect(() => {
        qcloudProvider.isServiceSupported('scf')
      }).not.toThrow(Error)
    })

    it('should throw error if service is not Supported', () => {
      expect(() => {
        qcloudProvider.isServiceSupported('unsupported')
      }).toThrow(Error)
    })
  })

  describe('#region', () => {
    it('should prefer options over config or provider', () => {
      qcloudProvider.options = { region: 'optionsRegion' }
      serverless.config = { region: 'configRegion' }
      serverless.service.provider = { region: 'providerRegion' }

      expect(qcloudProvider.region).toEqual('optionsRegion')
    })

    it('should prefer config over provider in lieu of options', () => {
      serverless.config = { region: 'configRegion' }
      serverless.service.provider = { region: 'providerRegion' }

      expect(qcloudProvider.region).toEqual('configRegion')
    })

    it('should use provider in lieu of options and config', () => {
      serverless.service.provider = { region: 'providerRegion' }

      expect(qcloudProvider.region).toEqual('providerRegion')
    })

    it('should use the default gz in lieu of options, config, and provider', () => {
      expect(qcloudProvider.region).toEqual('gz')
    })
  })
})
