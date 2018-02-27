import _ from 'lodash'
import chalk from 'chalk'
import { QcloudCommand } from '../lib'

export class QcloudInfo extends QcloudCommand {
  gatheredData

  constructor(serverless, options = {}) {
    super(serverless, options)

    this.commands = {
      qcloud: {
        type: 'entrypoint',
        usage: 'Show Qcloud Infomation',
        commands: {
          info: {
            lifecycleEvents: [
              'validate',
              'gatherData',
              'displayServiceInfo',
              'displayApiKeys',
              'displayEndpoints',
              'displayFunctions',
              'displayStackOutputs',
            ],
          },
        },
      },
    }

    this.hooks = {
      'info:info': () => this.serverless.pluginManager.spawn('qcloud:info'),

      'deploy:deploy': async () => {
        if (this.options.noDeploy) return
        return this.serverless.pluginManager.spawn('qcloud:info')
      },

      'qcloud:info:validate': async () => {
        await this.validate()
      },

      'qcloud:info:gatherData': async () => {
        await this.getCloudInfo()
        await this.getApiKeyValues()
      },

      'qcloud:info:displayServiceInfo': async () => {
        await this.displayServiceInfo()
      },

      'qcloud:info:displayApiKeys': async () => {
        await this.displayApiKeys()
      },

      'qcloud:info:displayEndpoints': async () => {
        await this.displayEndpoints()
      },

      'qcloud:info:displayFunctions': async () => {
        await this.displayFunctions()
      },

      'qcloud:info:displayStackOutputs': async () => {
        await this.displayStackOutputs()
      },
    }
  }

  async getCloudInfo() {
    const { provider, serverless: { service, cli } } = this

    // NOTE: this is the global gatheredData object which will be passed around
    this.gatheredData = {
      info: {
        service: service.service,
        region: provider.region,
        stage: provider.stage,
        endpoint: '',
        unreleased: false,
        functions: [],
      },
      output: {
        apigateway: {},
      },
    }

    // Functions
    service.getAllFunctions().forEach(name => {
      const func = service.getFunction(name)
      this.gatheredData.info.functions.push({
        name,
        deployedName: func.name,
      })
    })

    // API Gateway
    const apigateway = this.gatheredData.output.apigateway = await provider.getAPIGatewayService()

    if (!apigateway) return

    const { releaseStage } = provider

    this.gatheredData.info.endpoint = apigateway.protocol === 'https'
      ? `https://${apigateway.subDomain}`
      : apigateway.subDomain
    if (!this.gatheredData.info.endpoint.endsWith('/')) this.gatheredData.info.endpoint += '/'
    this.gatheredData.info.endpoint += releaseStage
    this.gatheredData.info.unrelease = !apigateway.availableEnvironments.includes(releaseStage)
  }

  displayServiceInfo() {
    const { gatheredData: { info }, serverless: { cli } } = this

    let message = ''
    message += chalk`{yellow.underline Service Information}\n`
    message += chalk`{yellow service:} ${info.service}\n`
    message += chalk`{yellow stage:} ${info.stage}\n`
    message += chalk`{yellow region:} ${info.region}`

    cli.consoleLog(message)
    return message
  }

  displayApiKeys() {
    const { options: { conceal }, gatheredData: { info }, serverless: { cli } } = this
    let apiKeysMessage = `${chalk.yellow('api keys:')}`

    if (info.apiKeys && info.apiKeys.length > 0) {
      info.apiKeys.forEach((apiKeyInfo) => {
        if (conceal) {
          apiKeysMessage += `\n  ${apiKeyInfo.name}`
        } else {
          apiKeysMessage += `\n  ${apiKeyInfo.name}: ${apiKeyInfo.value}`
        }
      })
    } else {
      apiKeysMessage += '\n  None'
    }

    cli.consoleLog(apiKeysMessage)
    return apiKeysMessage
  }

  displayEndpoints() {
    const { gatheredData: { info }, serverless: { service, cli } } = this
    let endpointsMessage = chalk`{yellow endpoints:}${info.unreleased ? chalk` {red [unreleased]}` : ''}`

    if (info.endpoint) {
      _.forEach(service.functions, (functionObject) => {
        functionObject.events.forEach(event => {
          if (event.http) {
            let method
            let path

            if (typeof event.http === 'object') {
              method = (event.http.method || 'get').toUpperCase()
              path = event.http.path
            } else {
              method = event.http.split(' ')[0].toUpperCase()
              path = event.http.split(' ')[1]
            }
            path = path !== '/' ? `/${path.split('/').filter(p => p !== '').join('/')}` : ''
            if (info.unreleased) {
              endpointsMessage += chalk`\n  ${method} - {dim ${info.endpoint}}${path}`
            } else {
              endpointsMessage += `\n  ${method} - ${info.endpoint}${path}`
            }
          }
        })
      })
    } else {
      endpointsMessage += '\n  None'
    }

    cli.consoleLog(endpointsMessage)
    return endpointsMessage
  }

  displayFunctions() {
    const { gatheredData: { info }, serverless: { cli } } = this
    let functionsMessage = `${chalk.yellow('functions:')}`

    if (info.functions && info.functions.length > 0) {
      info.functions.forEach((f) => {
        functionsMessage += `\n  ${f.name}: ${f.deployedName}`
      })
    } else {
      functionsMessage += '\n  None'
    }

    cli.consoleLog(functionsMessage)
    return functionsMessage
  }

  displayStackOutputs() {
    const { options, gatheredData: { output }, serverless: { service, cli } } = this
    let message = ''
    if (options.verbose) {
      message = `${chalk.yellow.underline('\nStack Outputs\n')}`
      _.forEach(output, (output) => {
        message += `${chalk.yellow(output.OutputKey)}: ${output.OutputValue}\n`
      })

      cli.consoleLog(message)
    }

    return message
  }

  getApiKeyValues() {
  //   const info = this.gatheredData.info

  //   info.apiKeys = []

  //   // check if the user has set api keys
  //   const apiKeyNames = this.serverless.service.provider.apiKeys || []

  //   if (apiKeyNames.length) {
  //     return this.provider.request('APIGateway',
  //       'getApiKeys',
  //       { includeValues: true }
  //     ).then((allApiKeys) => {
  //       const items = allApiKeys.items
  //       if (items && items.length) {
  //         // filter out the API keys only created for this stack
  //         const filteredItems = items.filter((item) => _.includes(apiKeyNames, item.name))

  //         // iterate over all apiKeys and push the API key info and update the info object
  //         filteredItems.forEach((item) => {
  //           const apiKeyInfo = {} as any
  //           apiKeyInfo.name = item.name
  //           apiKeyInfo.value = item.value
  //           info.apiKeys.push(apiKeyInfo)
  //         })
  //       }
  //       return BbPromise.resolve()
  //     })
  //   }
  //   return BbPromise.resolve()
  }
}
