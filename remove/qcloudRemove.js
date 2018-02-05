'use strict';

const BbPromise = require('bluebird');

const validate = require('../shared/validate');
const setDefaults = require('../shared/utils');
const emptyDeploymentBucket = require('./lib/emptyDeploymentBucket');
const removeDeployment = require('./lib/removeDeployment');

class QcloudRemove {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('qcloud');

    Object.assign(
      this,
      validate,
      setDefaults,
      setDeploymentBucketName,
      emptyDeploymentBucket,
      removeDeployment,
      monitorDeployment);

    // this.hooks = {
    //   'before:remove:remove': () => BbPromise.bind(this)
    //     .then(this.validate)
    //     .then(this.setDefaults)
    //     .then(this.setDeploymentBucketName),

    //   'remove:remove': () => BbPromise.bind(this)
    //     .then(this.emptyDeploymentBucket)
    //     .then(this.removeDeployment),
    // };
  }
}

module.exports = QcloudRemove;
