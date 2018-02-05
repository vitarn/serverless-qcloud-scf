'use strict';

const sinon = require('sinon');

const QcloudProvider = require('../../provider/qcloudProvider');
const QcloudPackage = require('../qcloudPackage');
const Serverless = require('../../test/serverless');

describe('CompileFunctions', () => {
  let serverless;
  let qcloudPackage;
  let consoleLogStub;

  beforeEach(() => {
    serverless = new Serverless();
    serverless.service.service = 'my-service';
    serverless.service.package = {
      artifact: 'artifact.zip',
      artifactDirectoryName: 'some-path',
    };
    serverless.service.provider = {
      compiledConfigurationTemplate: {
        resources: [],
      },
      deploymentBucketName: 'sls-my-service-dev-12345678',
    };
    serverless.setProvider('qcloud', new QcloudProvider(serverless));
    const options = {
      stage: 'dev',
      region: 'us-central1',
    };
    qcloudPackage = new QcloudPackage(serverless, options);
    consoleLogStub = sinon.stub(qcloudPackage.serverless.cli, 'log').returns();
  });

  afterEach(() => {
    qcloudPackage.serverless.cli.log.restore();
  });

  describe('#compileFunctions()', () => {
    it('should throw an error if the function has no handler property', () => {
      qcloudPackage.serverless.service.functions = {
        func1: {
          handler: null,
        },
      };

      expect(() => qcloudPackage.compileFunctions()).toThrow(Error);
    });

    it('should throw an error if the function has no events property', () => {
      qcloudPackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: null,
        },
      };

      expect(() => qcloudPackage.compileFunctions()).toThrow(Error);
    });

    it('should throw an error if the function has 0 events', () => {
      qcloudPackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [],
        },
      };

      expect(() => qcloudPackage.compileFunctions()).toThrow(Error);
    });

    it('should throw an error if the function has more than 1 event', () => {
      qcloudPackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [
            { http: 'event1' },
            { http: 'event2' },
          ],
        },
      };

      expect(() => qcloudPackage.compileFunctions()).toThrow(Error);
    });

    it('should throw an error if the functions event is not supported', () => {
      qcloudPackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [
            { invalidEvent: 'event1' },
          ],
        },
      };

      expect(() => qcloudPackage.compileFunctions()).toThrow(Error);
    });

    it('should set the memory size based on the functions configuration', () => {
      qcloudPackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          memorySize: 1024,
          events: [
            { http: 'foo' },
          ],
        },
      };

      const compiledResources = [{
        type: 'cloudfunctions.v1beta2.function',
        name: 'my-service-dev-func1',
        properties: {
          location: 'us-central1',
          function: 'func1',
          availableMemoryMb: 1024,
          timeout: '60s',
          sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
          httpsTrigger: {
            url: 'foo',
          },
        },
      }];

      return qcloudPackage.compileFunctions().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(qcloudPackage.serverless.service.provider.compiledConfigurationTemplate.resources)
          .toEqual(compiledResources);
      });
    });

    it('should set the memory size based on the provider configuration', () => {
      qcloudPackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [
            { http: 'foo' },
          ],
        },
      };
      qcloudPackage.serverless.service.provider.memorySize = 1024;

      const compiledResources = [{
        type: 'cloudfunctions.v1beta2.function',
        name: 'my-service-dev-func1',
        properties: {
          location: 'us-central1',
          function: 'func1',
          availableMemoryMb: 1024,
          timeout: '60s',
          sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
          httpsTrigger: {
            url: 'foo',
          },
        },
      }];

      return qcloudPackage.compileFunctions().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(qcloudPackage.serverless.service.provider.compiledConfigurationTemplate.resources)
          .toEqual(compiledResources);
      });
    });

    it('should set the timout based on the functions configuration', () => {
      qcloudPackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          timeout: '120s',
          events: [
            { http: 'foo' },
          ],
        },
      };

      const compiledResources = [{
        type: 'cloudfunctions.v1beta2.function',
        name: 'my-service-dev-func1',
        properties: {
          location: 'us-central1',
          function: 'func1',
          availableMemoryMb: 256,
          timeout: '120s',
          sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
          httpsTrigger: {
            url: 'foo',
          },
        },
      }];

      return qcloudPackage.compileFunctions().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(qcloudPackage.serverless.service.provider.compiledConfigurationTemplate.resources)
          .toEqual(compiledResources);
      });
    });

    it('should set the timeout based on the provider configuration', () => {
      qcloudPackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [
            { http: 'foo' },
          ],
        },
      };
      qcloudPackage.serverless.service.provider.timeout = '120s';

      const compiledResources = [{
        type: 'cloudfunctions.v1beta2.function',
        name: 'my-service-dev-func1',
        properties: {
          location: 'us-central1',
          function: 'func1',
          availableMemoryMb: 256,
          timeout: '120s',
          sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
          httpsTrigger: {
            url: 'foo',
          },
        },
      }];

      return qcloudPackage.compileFunctions().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(qcloudPackage.serverless.service.provider.compiledConfigurationTemplate.resources)
          .toEqual(compiledResources);
      });
    });

    it('should compile "http" events properly', () => {
      qcloudPackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [
            { http: 'foo' },
          ],
        },
      };

      const compiledResources = [{
        type: 'cloudfunctions.v1beta2.function',
        name: 'my-service-dev-func1',
        properties: {
          location: 'us-central1',
          function: 'func1',
          availableMemoryMb: 256,
          timeout: '60s',
          sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
          httpsTrigger: {
            url: 'foo',
          },
        },
      }];

      return qcloudPackage.compileFunctions().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(qcloudPackage.serverless.service.provider.compiledConfigurationTemplate.resources)
          .toEqual(compiledResources);
      });
    });

    it('should compile "event" events properly', () => {
      qcloudPackage.serverless.service.functions = {
        func1: {
          handler: 'func1',
          events: [
            {
              event: {
                eventType: 'foo',
                path: 'some-path',
                resource: 'some-resource',
              },
            },
          ],
        },
        func2: {
          handler: 'func2',
          events: [
            {
              event: {
                eventType: 'foo',
                resource: 'some-resource',
              },
            },
          ],
        },
      };

      const compiledResources = [
        {
          type: 'cloudfunctions.v1beta2.function',
          name: 'my-service-dev-func1',
          properties: {
            location: 'us-central1',
            function: 'func1',
            availableMemoryMb: 256,
            timeout: '60s',
            sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
            eventTrigger: {
              eventType: 'foo',
              path: 'some-path',
              resource: 'some-resource',
            },
          },
        },
        {
          type: 'cloudfunctions.v1beta2.function',
          name: 'my-service-dev-func2',
          properties: {
            location: 'us-central1',
            function: 'func2',
            availableMemoryMb: 256,
            timeout: '60s',
            sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
            eventTrigger: {
              eventType: 'foo',
              resource: 'some-resource',
            },
          },
        },
      ];

      return qcloudPackage.compileFunctions().then(() => {
        expect(consoleLogStub.called).toEqual(true);
        expect(qcloudPackage.serverless.service.provider.compiledConfigurationTemplate.resources)
          .toEqual(compiledResources);
      });
    });
  });
});
