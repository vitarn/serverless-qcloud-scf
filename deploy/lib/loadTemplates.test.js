/*global beforeEach, afterEach, expect*/

'use strict';

const fs = require('fs');
const path = require('path');

const QcloudProvider = require('../../provider/qcloudProvider');
const QcloudDeploy = require('../qcloudDeploy');
const Serverless = require('../../test/serverless');

xdescribe('UploadArtifacts', () => {
  let serverless;
  let qcloudDeploy;
  const servicePath = path.join(__dirname, '..', '..', 'test');

  beforeEach(() => {
    serverless = new Serverless();
    serverless.service.service = 'my-service';
    serverless.service.provider = {
      name: 'qcloud',
      credentials: path.join(__dirname, '..', '..', 'test', 'credentials')
    };
    serverless.config = { servicePath };
    const options = {
      stage: 'dev',
      region: 'cn-shanghai',
    };
    serverless.setProvider('qcloud', new QcloudProvider(serverless, options));
    qcloudDeploy = new QcloudDeploy(serverless, options);
  });

  describe('#loadTemplates()', () => {
    it('should make the templates accessible', () => {
      const create = fs.readFileSync(
        path.join(servicePath, '.serverless', 'configuration-template-create.json'), 'utf8');
      const update = fs.readFileSync(
        path.join(servicePath, '.serverless', 'configuration-template-update.json'), 'utf8');
      const templates = {
        create: JSON.parse(create),
        update: JSON.parse(update)
      };
      return qcloudDeploy.loadTemplates().then(() => {
        expect(qcloudDeploy.templates).toEqual(templates);
      });
    });
  });
});
