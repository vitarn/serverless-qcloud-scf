'use strict';

// const QcloudIndex = require('./index');
const QcloudProvider = require('./provider/qcloudProvider');
const QcloudPackage = require('./package/qcloudPackage');
// const QcloudDeploy = require('./deploy/qcloudDeploy');
// const QcloudRemove = require('./remove/qcloudRemove');
// const QcloudInvoke = require('./invoke/qcloudInvoke');
// const QcloudLogs = require('./logs/qcloudLogs');
// const QcloudInfo = require('./info/qcloudInfo');
const Serverless = require('./test/serverless');

xdescribe('QcloudIndex', () => {
  let serverless;
  let options;
  let qcloudIndex;

  beforeEach(() => {
    serverless = new Serverless();
    options = {
      stage: 'my-stage',
      region: 'my-region',
    };
    qcloudIndex = new QcloudIndex(serverless, options);
  });

  describe('#constructor()', () => {
    it('should set the serverless instance', () => {
      expect(qcloudIndex.serverless).toEqual(serverless);
    });

    it('should set options if provided', () => {
      expect(qcloudIndex.options).toEqual(options);
    });

    it('should add all the plugins to the Serverless PluginManager', () => {
      const addedPlugins = serverless.plugins;

      expect(addedPlugins).toContain(QcloudProvider);
      expect(addedPlugins).toContain(QcloudPackage);
      expect(addedPlugins).toContain(QcloudDeploy);
      expect(addedPlugins).toContain(QcloudRemove);
      expect(addedPlugins).toContain(QcloudInvoke);
      expect(addedPlugins).toContain(QcloudLogs);
      expect(addedPlugins).toContain(QcloudInfo);
    });
  });
});
