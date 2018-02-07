'use strict'

/*
NOTE: this plugin is used to add all the differnet provider related plugins at once.
This way only one plugin needs to be added to the service in order to get access to the
whole provider implementation.
*/

const QcloudProvider = require('./provider/qcloudProvider')
const QcloudPackage = require('./package/qcloudPackage')
const QcloudDeploy = require('./deploy/qcloudDeploy')
// const QcloudRemove = require('./remove/qcloudRemove')
// const QcloudInvoke = require('./invoke/qcloudInvoke')
// const QcloudLogs = require('./logs/qcloudLogs')
// const QcloudInfo = require('./info/qcloudInfo')

class QcloudIndex {
  constructor(serverless, options) {
    this.serverless = serverless
    this.options = options

    this.serverless.pluginManager.addPlugin(QcloudProvider)
    this.serverless.pluginManager.addPlugin(QcloudPackage)
    this.serverless.pluginManager.addPlugin(QcloudDeploy)
    // this.serverless.pluginManager.addPlugin(QcloudRemove)
    // this.serverless.pluginManager.addPlugin(QcloudInvoke)
    // this.serverless.pluginManager.addPlugin(QcloudLogs)
    // this.serverless.pluginManager.addPlugin(QcloudInfo)
  }
}

module.exports = QcloudIndex
