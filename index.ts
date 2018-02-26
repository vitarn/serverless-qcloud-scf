import chalk from 'chalk'

/*
NOTE: this plugin is used to add all the differnet provider related plugins at once.
This way only one plugin needs to be added to the service in order to get access to the
whole provider implementation.
*/

import { QcloudProvider } from './provider'
import { QcloudPackage } from './package'
import { QcloudDeploy } from './deploy'
import { QcloudRemove } from './remove'
// const QcloudInvoke = require('./invoke/qcloudInvoke')
// const QcloudLogs = require('./logs/qcloudLogs')
import { QcloudInfo } from './info'

export default class QcloudIndex {
    serverless
    options

    constructor(serverless, options) {
        this.serverless = serverless
        this.options = options

        Object.assign(serverless.cli, {
            warn(message) {
                serverless.cli.consoleLog(`Serverless: ${chalk.yellowBright(`[WARN] ${message}`)}`)
            },

            error(message) {
                serverless.cli.consoleLog(`Serverless: ${chalk.redBright(`[ERROR] ${message}`)}`)
            },
        })

        this.serverless.pluginManager.addPlugin(QcloudProvider)
        this.serverless.pluginManager.addPlugin(QcloudPackage)
        this.serverless.pluginManager.addPlugin(QcloudDeploy)
        this.serverless.pluginManager.addPlugin(QcloudRemove)
        // this.serverless.pluginManager.addPlugin(QcloudInvoke)
        // this.serverless.pluginManager.addPlugin(QcloudLogs)
        this.serverless.pluginManager.addPlugin(QcloudInfo)
    }
}
