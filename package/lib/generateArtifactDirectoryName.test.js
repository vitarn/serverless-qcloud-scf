'use strict';

const QcloudProvider = require('../../provider/qcloudProvider');
const QcloudPackage = require('../qcloudPackage');
const Serverless = require('../../test/serverless');

describe('GenerateArtifactDirectoryName', () => {
  let serverless;
  let qcloudPackage;

  beforeEach(() => {
    serverless = new Serverless();
    serverless.service.service = 'my-service';
    serverless.service.package = {
      artifactDirectoryName: null,
    };
    serverless.setProvider('qcloud', new QcloudProvider(serverless));
    const options = {
      stage: 'dev',
      region: 'gz',
    };
    qcloudPackage = new QcloudPackage(serverless, options);
  });

  it('should create a valid artifact directory name', () => {
    const expectedRegex = new RegExp('serverless/my-service/dev/.*');

    return qcloudPackage.generateArtifactDirectoryName().then(() => {
      expect(serverless.service.package.artifactDirectoryName)
        .toMatch(expectedRegex);
    });
  });
});
