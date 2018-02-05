'use strict'

const sinon = require('sinon')
const BbPromise = require('bluebird')

const QcloudProvider = require('../provider/qcloudProvider')
const QcloudPackage = require('./qcloudPackage')
const Serverless = require('../test/serverless')

describe('QcloudPackage', () => {
  let serverless
  let options
  let qcloudPackage

  beforeEach(() => {
    serverless = new Serverless()
    options = {
      stage: 'my-stage',
      region: 'my-region',
    }
    serverless.setProvider('qcloud', new QcloudProvider(serverless))
    qcloudPackage = new QcloudPackage(serverless, options)
  })

  describe('#constructor()', () => {
    it('should set the serverless instance', () => {
      expect(qcloudPackage.serverless).toEqual(serverless)
    })

    it('should set options if provided', () => {
      expect(qcloudPackage.options).toEqual(options)
    })

    it('should make the provider accessible', () => {
      expect(qcloudPackage.provider).toBeInstanceOf(QcloudProvider)
    })

    describe('hooks', () => {
      let cleanupServerlessDirStub
      let validateStub
      // let setDefaultsStub
      let setDeploymentBucketNameStub
      let prepareDeploymentStub
      let saveCreateTemplateFileStub
      let generateArtifactDirectoryNameStub
      let compileFunctionsStub
      let mergeServiceResourcesStub
      let saveUpdateTemplateFileStub

      beforeEach(() => {
        cleanupServerlessDirStub = sinon.stub(qcloudPackage, 'cleanupServerlessDir')
          .returns(BbPromise.resolve())
        validateStub = sinon.stub(qcloudPackage, 'validate')
          .returns(BbPromise.resolve())
        // setDefaultsStub = sinon.stub(qcloudPackage, 'setDefaults')
          // .returns(BbPromise.resolve())
        setDeploymentBucketNameStub = sinon.stub(qcloudPackage, 'setDeploymentBucketName')
          .returns(BbPromise.resolve())
        prepareDeploymentStub = sinon.stub(qcloudPackage, 'prepareDeployment')
          .returns(BbPromise.resolve())
        saveCreateTemplateFileStub = sinon.stub(qcloudPackage, 'saveCreateTemplateFile')
          .returns(BbPromise.resolve())
        generateArtifactDirectoryNameStub = sinon.stub(qcloudPackage, 'generateArtifactDirectoryName')
          .returns(BbPromise.resolve())
        compileFunctionsStub = sinon.stub(qcloudPackage, 'compileFunctions')
          .returns(BbPromise.resolve())
        mergeServiceResourcesStub = sinon.stub(qcloudPackage, 'mergeServiceResources')
          .returns(BbPromise.resolve())
        saveUpdateTemplateFileStub = sinon.stub(qcloudPackage, 'saveUpdateTemplateFile')
          .returns(BbPromise.resolve())
      })

      afterEach(() => {
        qcloudPackage.cleanupServerlessDir.restore()
        qcloudPackage.validate.restore()
        // qcloudPackage.setDefaults.restore()
        qcloudPackage.setDeploymentBucketName.restore()
        qcloudPackage.prepareDeployment.restore()
        qcloudPackage.saveCreateTemplateFile.restore()
        qcloudPackage.generateArtifactDirectoryName.restore()
        qcloudPackage.compileFunctions.restore()
        qcloudPackage.mergeServiceResources.restore()
        qcloudPackage.saveUpdateTemplateFile.restore()
      })

      it('should run "package:cleanup" promise chain', () => qcloudPackage
        .hooks['package:cleanup']().then(() => {
          expect(cleanupServerlessDirStub.calledOnce).toEqual(true)
        }))

      // it('should run "before:package:initialize" promise chain', () => qcloudPackage
      //   .hooks['before:package:initialize']().then(() => {
      //     expect(validateStub.calledOnce).toEqual(true)
      //     expect(setDefaultsStub.calledAfter(validateStub)).toEqual(true)
      //   }))

      it('should run "package:initialize" promise chain', () => qcloudPackage
        .hooks['package:initialize']().then(() => {
          expect(setDeploymentBucketNameStub.calledOnce).toEqual(true)
          expect(prepareDeploymentStub.calledAfter(setDeploymentBucketNameStub)).toEqual(true)
          expect(saveCreateTemplateFileStub.calledAfter(prepareDeploymentStub)).toEqual(true)
        }))

      it('should run "before:package:compileFunctions" promise chain', () => qcloudPackage
        .hooks['before:package:compileFunctions']().then(() => {
          expect(generateArtifactDirectoryNameStub.calledOnce).toEqual(true)
        }))

      it('should run "package:compileFunctions" promise chain', () => qcloudPackage
        .hooks['package:compileFunctions']().then(() => {
          expect(compileFunctionsStub.calledOnce).toEqual(true)
        }))

      it('should run "package:finalize" promise chain', () => qcloudPackage
        .hooks['package:finalize']().then(() => {
          expect(mergeServiceResourcesStub.calledOnce).toEqual(true)
          expect(saveUpdateTemplateFileStub.calledAfter(mergeServiceResourcesStub)).toEqual(true)
        }))
    })
  })
})
