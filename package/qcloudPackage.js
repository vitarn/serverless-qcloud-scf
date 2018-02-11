'use strict'

const cleanupServerlessDir = require('./lib/cleanupServerlessDir')
const validate = require('../lib/validate')
const utils = require('../lib/utils')
const prepareDeployment = require('./lib/prepareDeployment')
const saveCreateTemplateFile = require('./lib/writeFilesToDisk')
const compileFunctions = require('./lib/compileFunctions')
const generateArtifactDirectoryName = require('./lib/generateArtifactDirectoryName')
const mergeServiceResources = require('./lib/mergeServiceResources')
const saveUpdateTemplateFile = require('./lib/writeFilesToDisk')

class QcloudPackage {
  constructor(serverless, options) {
    this.serverless = serverless
    this.options = options
    this.provider = this.serverless.getProvider('qcloud')

    Object.assign(
      this,
      cleanupServerlessDir,
      validate,
      utils,
      prepareDeployment,
      saveCreateTemplateFile,
      compileFunctions,
      generateArtifactDirectoryName,
      mergeServiceResources,
      saveUpdateTemplateFile
    )

    this.hooks = {
      'package:cleanup': async () => {
        await this.cleanupServerlessDir()
      },

      'before:package:initialize': async () => {
        await this.validate()
      },

      'package:initialize': async () => {
        await this.prepareDeployment()
        await this.saveCreateTemplateFile()
      },

      'package:compileFunctions': async () => {
        await this.compileFunctions()
      },

      'package:finalize': async () => {
        await this.generateArtifactDirectoryName()
        await this.mergeServiceResources()
        await this.saveUpdateTemplateFile()
      },
    }
  }
}

module.exports = QcloudPackage
