import QcloudIndex from './index'
import { QcloudProvider } from './provider'
import {
    QcloudPackage, QcloudDeploy, QcloudRemove, QcloudInfo,
    // QcloudInvoke, QcloudLogs,
} from './commands'
import { Serverless } from './test/serverless'

describe('QcloudIndex', () => {
    let serverless
    let options
    let qcloudIndex

    beforeEach(() => {
        serverless = new Serverless()
        options = {
            stage: 'my-stage',
            region: 'my-region',
        }
        qcloudIndex = new QcloudIndex(serverless, options)
    })

    describe('#constructor()', () => {
        it('should set the serverless instance', () => {
            expect(qcloudIndex.serverless).toEqual(serverless)
        })

        it('should set options if provided', () => {
            expect(qcloudIndex.options).toEqual(options)
        })

        it('should add all the plugins to the Serverless PluginManager', () => {
            const addedPlugins = serverless.plugins

            expect(addedPlugins).toContain(QcloudProvider)
            expect(addedPlugins).toContain(QcloudPackage)
            expect(addedPlugins).toContain(QcloudDeploy)
            expect(addedPlugins).toContain(QcloudRemove)
            // expect(addedPlugins).toContain(QcloudInvoke)
            // expect(addedPlugins).toContain(QcloudLogs)
            expect(addedPlugins).toContain(QcloudInfo)
        })
    })
})
