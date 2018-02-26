import { QcloudProvider } from '../provider'

export class Serverless {
    providers: {
        qcloud: QcloudProvider
    }
    service
    config
    utils
    cli
    plugins: any[]
    pluginManager

    setProvider(name: 'qcloud', provider: QcloudProvider): void
    getProvider(name: 'qcloud'): QcloudProvider
}
