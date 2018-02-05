'use strict';

const sinon = require('sinon');
const BbPromise = require('bluebird');

const QcloudProvider = require('../provider/qcloudProvider');
const QcloudRemove = require('./qcloudRemove');
const Serverless = require('../test/serverless');

xdescribe('QcloudRemove', () => {
  let serverless;
  let options;
  let qcloudRemove;

  beforeEach(() => {
    serverless = new Serverless();
    options = {
      stage: 'my-stage',
      region: 'my-region',
    };
    serverless.setProvider('qcloud', new QcloudProvider(serverless));
    qcloudRemove = new QcloudRemove(serverless, options);
  });

  describe('#constructor()', () => {
    it('should set the serverless instance', () => {
      expect(qcloudRemove.serverless).toEqual(serverless);
    });

    it('should set options if provided', () => {
      expect(qcloudRemove.options).toEqual(options);
    });

    it('should make the provider accessible', () => {
      expect(qcloudRemove.provider).toBeInstanceOf(QcloudProvider);
    });

    describe('hooks', () => {
      let validateStub;
      let setDefaultsStub;
      let setDeploymentBucketNameStub;
      let emptyDeploymentBucketStub;
      let removeDeploymentStub;

      beforeEach(() => {
        validateStub = sinon.stub(qcloudRemove, 'validate')
          .returns(BbPromise.resolve());
        setDefaultsStub = sinon.stub(qcloudRemove, 'setDefaults')
          .returns(BbPromise.resolve());
        setDeploymentBucketNameStub = sinon.stub(qcloudRemove, 'setDeploymentBucketName')
          .returns(BbPromise.resolve());
        emptyDeploymentBucketStub = sinon.stub(qcloudRemove, 'emptyDeploymentBucket')
          .returns(BbPromise.resolve());
        removeDeploymentStub = sinon.stub(qcloudRemove, 'removeDeployment')
          .returns(BbPromise.resolve());
      });

      afterEach(() => {
        qcloudRemove.validate.restore();
        qcloudRemove.setDefaults.restore();
        qcloudRemove.setDeploymentBucketName.restore();
        qcloudRemove.emptyDeploymentBucket.restore();
        qcloudRemove.removeDeployment.restore();
      });

      it('should run "before:remove:remove" promise chain', () => qcloudRemove
        .hooks['before:remove:remove']().then(() => {
          expect(validateStub.calledOnce).toEqual(true);
          expect(setDefaultsStub.calledAfter(validateStub)).toEqual(true);
          expect(setDeploymentBucketNameStub.calledAfter(setDefaultsStub)).toEqual(true);
        }));

      it('should run "remove:remove" promise chain', () => qcloudRemove
        .hooks['remove:remove']().then(() => {
          expect(emptyDeploymentBucketStub.calledOnce).toEqual(true);
          expect(removeDeploymentStub.calledAfter(emptyDeploymentBucketStub)).toEqual(true);
        }));
    });
  });
});
