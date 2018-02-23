'use strict'

const chalk = require('chalk')
const _ = require('lodash')

module.exports = {
  displayServiceInfo() {
    const { gatheredData: { info }, serverless: { cli } } = this

    let message = ''
    message += chalk`{yellow.underline Service Information}\n`
    message += chalk`{yellow service:} ${info.service}\n`
    message += chalk`{yellow stage:} ${info.stage}\n`
    message += chalk`{yellow region:} ${info.region}`

    cli.consoleLog(message)
    return message
  },

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
  },

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
              method = event.http.method.toUpperCase()
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
  },

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
  },

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
  },
}
