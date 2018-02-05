'use stict';

const QcloudProvider = require('../../provider/qcloudProvider');
const QcloudPackage = require('../qcloudPackage');
const Serverless = require('../../test/serverless');

describe('MergeServiceResources', () => {
  let serverless;
  let qcloudPackage;

  beforeEach(() => {
    serverless = new Serverless();
    serverless.service.service = 'my-service';
    serverless.service.provider = {
      compiledConfigurationTemplate: {},
    };
    serverless.setProvider('qcloud', new QcloudProvider(serverless));
    const options = {
      stage: 'dev',
      region: 'us-central1',
    };
    qcloudPackage = new QcloudPackage(serverless, options);
  });

  it('should resolve if service resources are not defined', () => qcloudPackage
    .mergeServiceResources().then(() => {
      expect(serverless.service.provider
        .compiledConfigurationTemplate).toEqual({});
    }));

  it('should resolve if service resources is empty', () => {
    serverless.service.resources = {};

    return qcloudPackage.mergeServiceResources().then(() => {
      expect(serverless.service.provider
        .compiledConfigurationTemplate).toEqual({});
    });
  });

  it('should merge all the resources if provided', () => {
    serverless.service.provider.compiledConfigurationTemplate = {
      resources: [
        {
          name: 'resource1',
          type: 'type1',
          properties: {
            property1: 'value1',
          },
        },
      ],
    };

    serverless.service.resources = {
      resources: [
        {
          name: 'resource2',
          type: 'type2',
          properties: {
            property1: 'value1',
          },
        },
      ],
      imports: [
        {
          path: 'path/to/template.jinja',
          name: 'my-template',
        },
      ],
    };

    const expectedResult = {
      resources: [
        {
          name: 'resource1',
          type: 'type1',
          properties: {
            property1: 'value1',
          },
        },
        {
          name: 'resource2',
          type: 'type2',
          properties: {
            property1: 'value1',
          },
        },
      ],
      imports: [
        {
          path: 'path/to/template.jinja',
          name: 'my-template',
        },
      ],
    };

    return qcloudPackage.mergeServiceResources().then(() => {
      expect(serverless.service.provider.compiledConfigurationTemplate)
        .toEqual(expectedResult);
    });
  });
});
