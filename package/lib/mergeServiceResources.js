'use strict'

/* eslint no-use-before-define: 0 */

const _ = require('lodash')

module.exports = {
  async mergeServiceResources() {
    const resources = this.serverless.service.resources

    if ((typeof resources === 'undefined') || _.isEmpty(resources)) return

    _.mergeWith(
      this.serverless.service.provider.compiledConfigurationTemplate,
      resources,
      mergeCustomizer
    )
  },
}

const mergeCustomizer = (objValue, srcValue) => {
  if (_.isArray(objValue)) return objValue.concat(srcValue)
  return objValue
}
