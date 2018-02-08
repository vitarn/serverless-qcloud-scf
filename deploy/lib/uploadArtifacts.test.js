/*global beforeEach, afterEach, expect*/

'use strict'

const fs = require('fs')
const path = require('path')

const sinon = require('sinon')
const BbPromise = require('bluebird')

const QcloudProvider = require('../../provider/qcloudProvider')
const QcloudDeploy = require('../qcloudDeploy')
const Serverless = require('../../test/serverless')

xdescribe('UploadArtifacts', () => {
  let serverless
  let qcloudDeploy

  beforeEach(() => {
    serverless = new Serverless()
    serverless.service.service = 'my-service'
    serverless.service.package = {
      artifactFilePath: '/some-remote-file-path',
      artifact: 'artifact.zip'
    }
    serverless.service.provider = {
      name: 'qcloud',
      credentials: path.join(__dirname, '..', '..', 'test', 'credentials')
    }
    serverless.config = {
      servicePath: path.join(__dirname, '..', '..', 'test')
    }
    const options = {
      stage: 'dev',
      region: 'cn-shanghai',
    }
    serverless.setProvider('qcloud', new QcloudProvider(serverless, options))
    qcloudDeploy = new QcloudDeploy(serverless, options)
    qcloudDeploy.provider.resetOssClient('test-bucket')
    qcloudDeploy.templates = {
      create: require(path.join(__dirname, '..', '..', 'test', '.serverless', 'configuration-template-create.json')),
      update: require(path.join(__dirname, '..', '..', 'test', '.serverless', 'configuration-template-update.json')),
    }
  })

  describe('#uploadArtifacts()', () => {
    let consoleLogStub
    let uploadObjectStub

    beforeEach(() => {
      consoleLogStub = sinon.stub(qcloudDeploy.serverless.cli, 'log').returns()
      uploadObjectStub = sinon.stub(qcloudDeploy.provider, 'uploadObject')
    })

    afterEach(() => {
      qcloudDeploy.serverless.cli.log.restore()
      qcloudDeploy.provider.uploadObject.restore()
    })

    it('should upload corresponding objects to deployment bucket', () => {
      uploadObjectStub.returns(BbPromise.resolve())
      return qcloudDeploy
        .uploadArtifacts().then(() => {
          expect(uploadObjectStub.calledOnce).toEqual(true)
          expect(uploadObjectStub.calledWithExactly(
            'serverless/my-service/dev/1500622721413-2017-07-21T07:38:41.413Z/my-service.zip',
            '/projects/.serverless/my-service.zip'
          )).toEqual(true)
          const logs = [
            'Uploading serverless/my-service/dev/1500622721413-2017-07-21T07:38:41.413Z/my-service.zip to OSS bucket sls-my-service...',
            'Uploaded serverless/my-service/dev/1500622721413-2017-07-21T07:38:41.413Z/my-service.zip to OSS bucket sls-my-service'
          ]
          expect(consoleLogStub.callCount).toEqual(logs.length)
          for (var i = 0; i < consoleLogStub.callCount; ++i) {
            expect(consoleLogStub.calledWithExactly(logs[i])).toEqual(true)
          }
        })
    })
  })
})
