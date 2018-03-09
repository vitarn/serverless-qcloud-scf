import { Serverless } from '../types'

export class Command {
    serverless: Serverless
    provider
    options
    hooks
    commands

    constructor(serverless: Serverless, options = {}) {
        this.serverless = serverless
        this.provider = this.serverless.getProvider('qcloud')
        this.options = options
    }
}
