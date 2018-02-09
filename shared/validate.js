'use strict'

const _ = require('lodash')

module.exports = {
  async validate() {
    this.validateServicePath()
    this.validateServiceName()
    this.validateFunctionNames()
    this.validateHandlers()
  },

  validateServicePath() {
    if (!this.serverless.config.servicePath) {
      throw new Error('This command can only be run inside a service directory')
    }
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
  },
  
  validateFunctionNames() {
    _.forEach(this.serverless.service.functions, (funcObject, funcKey) => {
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
  },

  validateHandlers() {
    _.forEach(this.serverless.service.functions, (funcObject, funcKey) => {
      if (!funcObject.handler) {
        const errorMessage = [
          `Missing "handler" property for function "${funcKey}".`,
          ' Your function needs a "handler".',
          ' Please check the docs for more info.',
        ].join('')
        throw new Error(errorMessage)
      }
    })
  },
}
