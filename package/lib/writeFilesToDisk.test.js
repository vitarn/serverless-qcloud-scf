'use strict';

const path = require('path');

const sinon = require('sinon');

const QcloudProvider = require('../../provider/qcloudProvider');
const QcloudPackage = require('../qcloudPackage');
const Serverless = require('../../test/serverless');

describe('WriteFilesToDisk', () => {
  let serverless;
  let qcloudPackage;
  let writeFileSyncStub;

  beforeEach(() => {
    serverless = new Serverless();
    serverless.service.service = 'my-service';
    serverless.service.provider = {
      compiledConfigurationTemplate: {
        foo: 'bar',
      },
    };
    serverless.config = {
      servicePath: 'foo/my-service',
    };
    serverless.setProvider('qcloud', new QcloudProvider(serverless));
    const options = {
      stage: 'dev',
      region: 'us-central1',
    };
    qcloudPackage = new QcloudPackage(serverless, options);
    writeFileSyncStub = sinon.stub(qcloudPackage.serverless.utils, 'writeFileSync');
  });

  afterEach(() => {
    qcloudPackage.serverless.utils.writeFileSync.restore();
  });

  describe('#saveCreateTemplateFile()', () => {
    it('should write the template file into the services .serverless directory', () => {
      const createFilePath = path.join(
        qcloudPackage.serverless.config.servicePath,
        '.serverless',
        'configuration-template-create.yml',
      );

      return qcloudPackage.saveCreateTemplateFile().then(() => {
        expect(writeFileSyncStub.calledWithExactly(
          createFilePath,
          qcloudPackage.serverless.service.provider.compiledConfigurationTemplate,
        )).toEqual(true);
      });
    });
  });

  describe('#saveUpdateTemplateFile()', () => {
    it('should write the template file into the services .serverless directory', () => {
      const updateFilePath = path.join(
        qcloudPackage.serverless.config.servicePath,
        '.serverless',
        'configuration-template-update.yml',
      );

      return qcloudPackage.saveUpdateTemplateFile().then(() => {
        expect(writeFileSyncStub.calledWithExactly(
          updateFilePath,
          qcloudPackage.serverless.service.provider.compiledConfigurationTemplate,
        )).toEqual(true);
      });
    });
  });
});
