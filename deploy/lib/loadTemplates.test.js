/*global beforeEach, afterEach, expect*/

'use strict'

const path = require('path')
const sinon = require('sinon')

const QcloudProvider = require('../../provider/qcloudProvider')
const QcloudDeploy = require('../qcloudDeploy')
const Serverless = require('../../test/serverless')

describe('UploadArtifacts', () => {
  let serverless
  let qcloudDeploy
  let readFileSyncStub
  const servicePath = path.join(__dirname, '..', '..', 'test')

  beforeEach(() => {
    serverless = new Serverless()
    serverless.service.service = 'my-service'
    serverless.service.provider = {
      name: 'qcloud',
      credentials: path.join(__dirname, '..', '..', 'test', 'credentials')
    }
    serverless.config = { servicePath }
    const options = {
      stage: 'dev',
      region: 'sh',
    }
    serverless.setProvider('qcloud', new QcloudProvider(serverless, options))
    qcloudDeploy = new QcloudDeploy(serverless, options)
    readFileSyncStub = sinon.stub(serverless.utils, 'readFileSync')
  })

  afterEach(() => {
    serverless.utils.readFileSync.restore()
  })

  describe('#loadTemplates()', () => {
    it('should make the templates accessible', async () => {
      await qcloudDeploy.loadTemplates()

      expect(readFileSyncStub.calledTwice).toEqual(true)
    })
  })
})
