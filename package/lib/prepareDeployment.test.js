'use strict';

const sinon = require('sinon');

const QcloudProvider = require('../../provider/qcloudProvider');
const QcloudPackage = require('../qcloudPackage');
const Serverless = require('../../test/serverless');

xdescribe('PrepareDeployment', () => {
  let coreResources;
  let serverless;
  let qcloudPackage;

  beforeEach(() => {
    coreResources = {
      Resources: {
        ServerlessDeploymentBucket: {
          Properties: 'will-be-replaced-by-serverless',
        },
      },
    };
    serverless = new Serverless();
    serverless.service.service = 'my-service';
    serverless.service.provider = {
      compiledConfigurationTemplate: coreResources,
      deploymentBucketName: 'sls-my-service-dev-12345678',
    };
    serverless.setProvider('qcloud', new QcloudProvider(serverless));
    const options = {
      stage: 'dev',
      region: 'gz',
    };
    qcloudPackage = new QcloudPackage(serverless, options);
  });

  describe('#prepareDeployment()', () => {
    let readFileSyncStub;

    beforeEach(() => {
      readFileSyncStub = sinon.stub(serverless.utils, 'readFileSync').returns(coreResources);
    });

    afterEach(() => {
      serverless.utils.readFileSync.restore();
    });

    it('should load the core configuration template into the serverless instance', () => {
      const expectedCompiledConfiguration = {
        resources: [
          {
            type: 'storage.v1.bucket',
            name: 'sls-my-service-dev-12345678',
          },
        ],
      };

      return qcloudPackage.prepareDeployment().then(() => {
        expect(readFileSyncStub.calledOnce).toEqual(true);
        expect(serverless.service.provider
          .compiledConfigurationTemplate).toEqual(expectedCompiledConfiguration);
      });
    });
  });
});
