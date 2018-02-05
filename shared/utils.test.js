'use strict';

const setDefaults = require('./utils');
const QcloudProvider = require('../provider/qcloudProvider');
const Serverless = require('../test/serverless');
const QcloudCommand = require('../test/qcloudCommand');

describe('Utils', () => {
  let serverless;
  let qcloudCommand;

  beforeEach(() => {
    serverless = new Serverless();
    serverless.setProvider('qcloud', new QcloudProvider(serverless));
    qcloudCommand = new QcloudCommand(serverless, {}, setDefaults);
  });

  describe('#setDefaults()', () => {
    it('should set default values for options if not provided', () => qcloudCommand
      .setDefaults().then(() => {
        expect(qcloudCommand.options.stage).toEqual('dev');
        expect(qcloudCommand.options.region).toEqual('gz');
      }));

    it('should set the options when they are provided', () => {
      qcloudCommand.options.stage = 'my-stage';
      qcloudCommand.options.region = 'my-region';

      return qcloudCommand.setDefaults().then(() => {
        expect(qcloudCommand.options.stage).toEqual('my-stage');
        expect(qcloudCommand.options.region).toEqual('my-region');
      });
    });
  });
});
