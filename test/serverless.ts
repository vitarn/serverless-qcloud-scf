import { Serverless as CServerless } from '../types'
import { QcloudProvider } from '../provider'

// mock of the serverless instance
export class Serverless implements CServerless {
  providers: {
    qcloud: QcloudProvider
  }
  config
  service
  utils
  cli
  plugins
  pluginManager

  constructor() {
    this.providers = {} as any

    this.service = {}
    this.service.getAllFunctions = function () { //eslint-disable-line
      return Object.keys(this.functions || [])
    }
    this.service.getFunction = function (functionName) { //eslint-disable-line
      // NOTE the stage is always 'dev'!
      this.functions[functionName]
        .name = `${this.service}-dev-${functionName}`
      return this.functions[functionName]
    }
    this.utils = {
      writeFileSync() {},
      readFileSync() {},
    }

    this.cli = {
      log() {},
      consoleLog() {},
      printDot() {},
    }

    this.plugins = []
    this.pluginManager = {
      addPlugin: plugin => this.plugins.push(plugin),
    }
  }

  setProvider(name: 'qcloud', provider: QcloudProvider) {
    this.providers[name] = provider
  }

  getProvider(name: 'qcloud'): QcloudProvider {
    return this.providers[name]
  }
}
