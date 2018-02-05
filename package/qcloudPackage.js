'use strict';

const BbPromise = require('bluebird');

const cleanupServerlessDir = require('./lib/cleanupServerlessDir');
const validate = require('../shared/validate');
const utils = require('../shared/utils');
const prepareDeployment = require('./lib/prepareDeployment');
const saveCreateTemplateFile = require('./lib/writeFilesToDisk');
const mergeServiceResources = require('./lib/mergeServiceResources');
const compileFunctions = require('./lib/compileFunctions');
const saveUpdateTemplateFile = require('./lib/writeFilesToDisk');

class QcloudPackage {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('qcloud');

    Object.assign(
      this,
      cleanupServerlessDir,
      validate,
      utils,
      prepareDeployment,
      saveCreateTemplateFile,
      compileFunctions,
      mergeServiceResources,
      saveUpdateTemplateFile);

    this.hooks = {
      'package:cleanup': () => BbPromise.bind(this)
        .then(this.cleanupServerlessDir),

      'before:package:initialize': () => BbPromise.bind(this)
        .then(this.validate)
        .then(this.setDefaults),

      'package:initialize': () => BbPromise.bind(this)
        .then(this.prepareDeployment)
        .then(this.saveCreateTemplateFile),

      'package:compileFunctions': () => BbPromise.bind(this)
        .then(this.compileFunctions),

      'package:finalize': () => BbPromise.bind(this)
        .then(this.mergeServiceResources)
        .then(this.saveUpdateTemplateFile),
    };
  }
}

module.exports = QcloudPackage;
