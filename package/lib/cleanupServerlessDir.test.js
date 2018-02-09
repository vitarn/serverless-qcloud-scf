'use strict'

const path = require('path')

const sinon = require('sinon')
const fse = require('fs-extra')

const QcloudProvider = require('../../provider/qcloudProvider')
const QcloudPackage = require('../qcloudPackage')
const Serverless = require('../../test/serverless')

describe('CleanupServerlessDir', () => {
  let serverless
  let qcloudPackage
  let pathExistsStub
  let removeStub

  beforeEach(() => {
    serverless = new Serverless()
    serverless.service.service = 'my-service'
    serverless.config = {
      servicePath: false,
    }
    serverless.setProvider('qcloud', new QcloudProvider(serverless))
    const options = {
      stage: 'dev',
      region: 'sh',
    }
    qcloudPackage = new QcloudPackage(serverless, options)
    pathExistsStub = sinon.stub(fse, 'pathExists')
    removeStub = sinon.stub(fse, 'remove').returns()
  })

  afterEach(() => {
    fse.pathExists.restore()
    fse.remove.restore()
  })

  describe('#cleanupServerlessDir()', () => {
    it('should resolve if no servicePath is given', async () => {
      qcloudPackage.serverless.config.servicePath = false

      pathExistsStub.returns()

      await qcloudPackage.cleanupServerlessDir()

      expect(pathExistsStub.calledOnce).toEqual(false)
      expect(removeStub.calledOnce).toEqual(false)
    })

    it('should remove the .serverless directory if it exists', async () => {
      const serviceName = qcloudPackage.serverless.service.service
      qcloudPackage.serverless.config.servicePath = serviceName
      const serverlessDirPath = path.join(serviceName, '.serverless')

      pathExistsStub.returns(true)

      await qcloudPackage.cleanupServerlessDir()

      expect(pathExistsStub.calledWithExactly(serverlessDirPath)).toEqual(true)
      expect(removeStub.calledWithExactly(serverlessDirPath)).toEqual(true)
    })

    it('should not remove the .serverless directory if does not exist', async () => {
      const serviceName = qcloudPackage.serverless.service.service
      qcloudPackage.serverless.config.servicePath = serviceName
      const serverlessDirPath = path.join(serviceName, '.serverless')

      pathExistsStub.returns(false)

      await qcloudPackage.cleanupServerlessDir()

      expect(pathExistsStub.calledWithExactly(serverlessDirPath)).toEqual(true)
      expect(removeStub.calledWithExactly(serverlessDirPath)).toEqual(false)
    })
  })
})
