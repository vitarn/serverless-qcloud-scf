'use strict';

/* eslint no-use-before-define: 0 */

const path = require('path');

const _ = require('lodash');
const BbPromise = require('bluebird');

module.exports = {
  prepareDeployment() {
    const { provider, serverless: { service, utils, cli } } = this;

    cli.log(`Prepare deployment template`);

    const deploymentTemplate = utils.readFileSync(
      path.join(
        __dirname,
        '..',
        'templates',
        'core-configuration-template.json'));

    deploymentTemplate.Resources.ServerlessDeploymentBucket.Type =
      provider.naming.deploymentBucketType;
    deploymentTemplate.Resources.ServerlessDeploymentBucket.Properties.BucketName =
      provider.naming.deploymentBucketName;
    deploymentTemplate.Resources.ServerlessDeploymentBucket.Properties.Region =
      service.provider.region;

    service.provider.compiledConfigurationTemplate = deploymentTemplate;

    return BbPromise.resolve();
  },
};
