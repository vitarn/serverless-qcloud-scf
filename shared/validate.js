'use strict'

const BbPromise = require('bluebird')
const _ = require('lodash')

module.exports = {
  validate() {
    return BbPromise.bind(this)
      .then(this.validateServicePath)
      .then(this.validateServiceName)
      .then(this.validateFunctionNames)
      .then(this.validateHandlers)
  },

  validateServicePath() {
    if (!this.serverless.config.servicePath) {
      throw new Error('This command can only be run inside a service directory')
    }

    return BbPromise.resolve()
  },

  validateServiceName() {
    const name = this.serverless.service.service

    if (name.length > 60) {
      throw new Error(`Your service name "${name}" should not longer than 60 characters.`)
    }

    if (!/^[a-z]/i.test(name)) {
      throw new Error(`Your service name "${name}" should start with letter.`)
    }

    if (!/^.[\w-]*$/.test(name)) {
      throw new Error(`Your service name "${name}" should consist only of "a-z, A-Z, 0-9, -, _"`)
    }

    return BbPromise.resolve()
  },
  
  validateFunctionNames() {
    const functions = this.serverless.service.functions

    _.forEach(functions, (funcObject, funcKey) => {
      if (funcKey.length > 60) {
        throw new Error(`Your function name "${funcKey}" should not longer than 60 characters.`)
      }

      if (!/^[a-z]/i.test(funcKey)) {
        throw new Error(`Your function name "${funcKey}" should start with letter.`)
      }

      if (!/^.[\w-]*$/.test(funcKey)) {
        throw new Error(`Your function name "${funcKey}" should consist only of "a-z, A-Z, 0-9, -, _"`)
      }
    })
    return BbPromise.resolve()
  },

  validateHandlers() {
    const functions = this.serverless.service.functions

    _.forEach(functions, (funcVal, funcKey) => {
      if (!funcObject.handler) {
        const errorMessage = [
          `Missing "handler" property for function "${funcKey}".`,
          ' Your function needs a "handler".',
          ' Please check the docs for more info.',
        ].join('')
        throw new Error(errorMessage)
      }

      // if (funcVal.handler.includes('/') || funcVal.handler.includes('.')) {
      //   const errorMessage = [
      //     `The "handler" property for the function "${funcKey}" is invalid.`,
      //     ' Handlers should be plain strings referencing only the exported function name',
      //     ' without characters such as "." or "/" (so e.g. "http" instead of "index.http").',
      //     ' Do you want to nest your functions code in a subdirectory?',
      //     ' Google solves this by utilizing the "main" config in the projects package.json file.',
      //     ' Please check the docs for more info.',
      //   ].join('')
      //   throw new Error(errorMessage)
      // }
    })
  },
}
