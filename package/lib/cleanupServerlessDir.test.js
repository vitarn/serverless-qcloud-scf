'use strict';

const path = require('path');

const sinon = require('sinon');
const fse = require('fs-extra');

const QcloudProvider = require('../../provider/qcloudProvider');
const QcloudPackage = require('../qcloudPackage');
const Serverless = require('../../test/serverless');

describe('CleanupServerlessDir', () => {
  let serverless;
  let qcloudPackage;
  let pathExistsSyncStub;
  let removeSyncStub;

  beforeEach(() => {
    serverless = new Serverless();
    serverless.service.service = 'my-service';
    serverless.config = {
      servicePath: false,
    };
    serverless.setProvider('qcloud', new QcloudProvider(serverless));
    const options = {
      stage: 'dev',
      region: 'us-central1',
    };
    qcloudPackage = new QcloudPackage(serverless, options);
    pathExistsSyncStub = sinon.stub(fse, 'pathExistsSync');
    removeSyncStub = sinon.stub(fse, 'removeSync').returns();
  });

  afterEach(() => {
    fse.pathExistsSync.restore();
    fse.removeSync.restore();
  });

  describe('#cleanupServerlessDir()', () => {
    it('should resolve if no servicePath is given', () => {
      qcloudPackage.serverless.config.servicePath = false;

      pathExistsSyncStub.returns();

      return qcloudPackage.cleanupServerlessDir().then(() => {
        expect(pathExistsSyncStub.calledOnce).toEqual(false);
        expect(removeSyncStub.calledOnce).toEqual(false);
      });
    });

    it('should remove the .serverless directory if it exists', () => {
      const serviceName = qcloudPackage.serverless.service.service;
      qcloudPackage.serverless.config.servicePath = serviceName;
      const serverlessDirPath = path.join(serviceName, '.serverless');

      pathExistsSyncStub.returns(true);

      return qcloudPackage.cleanupServerlessDir().then(() => {
        expect(pathExistsSyncStub.calledWithExactly(serverlessDirPath)).toEqual(true);
        expect(removeSyncStub.calledWithExactly(serverlessDirPath)).toEqual(true);
      });
    });

    it('should not remove the .serverless directory if does not exist', () => {
      const serviceName = qcloudPackage.serverless.service.service;
      qcloudPackage.serverless.config.servicePath = serviceName;
      const serverlessDirPath = path.join(serviceName, '.serverless');

      pathExistsSyncStub.returns(false);

      return qcloudPackage.cleanupServerlessDir().then(() => {
        expect(pathExistsSyncStub.calledWithExactly(serverlessDirPath)).toEqual(true);
        expect(removeSyncStub.calledWithExactly(serverlessDirPath)).toEqual(false);
      });
    });
  });
});
