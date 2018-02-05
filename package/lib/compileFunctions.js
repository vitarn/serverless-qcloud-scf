'use strict';

/* eslint no-use-before-define: 0 */

const path = require('path');

const _ = require('lodash');
const BbPromise = require('bluebird');

module.exports = {
  compileFunctions() {
    const { provider, serverless: { service, utils, cli } } = this;

    const artifactFilePath = service.package.artifact;
    const fileName = artifactFilePath.split(path.sep).pop();

    service.package.artifactFilePath = `${service.package.artifactDirectoryName}/${fileName}`;
    
    service.provider.compiledConfigurationTemplate.Resources.ServerlessCloudFunctions = [];
    
    service.getAllFunctions().forEach((functionName) => {
      const funcObject = service.getFunction(functionName);

      cli.log(`Compiling function "${functionName}"...`);
      
      const funcTemplate = getFunctionTemplate(
        funcObject,
        this.options);

      funcTemplate.type = provider.naming.cloudFunctionType;    
      funcTemplate.Properties.runtime = _.capitalize(_.get(funcObject, 'runtime')
        || _.get(this, 'serverless.service.provider.runtime')
        || 'nodejs6.10');
      funcTemplate.Properties.memorySize = _.get(funcObject, 'memorySize')
        || _.get(this, 'serverless.service.provider.memorySize')
        || 128;
      funcTemplate.Properties.timeout = _.get(funcObject, 'timeout')
        || _.get(this, 'serverless.service.provider.timeout')
        || 3;

      // const eventType = Object.keys(funcObject.events[0])[0];

      // if (eventType === 'http') {
      //   const url = funcObject.events[0].http;

      //   funcTemplate.properties.httpsTrigger = {};
      //   funcTemplate.properties.httpsTrigger.url = url;
      // }
      // if (eventType === 'event') {
      //   const type = funcObject.events[0].event.eventType;
      //   const path = funcObject.events[0].event.path; //eslint-disable-line
      //   const resource = funcObject.events[0].event.resource;

      //   funcTemplate.properties.eventTrigger = {};
      //   funcTemplate.properties.eventTrigger.eventType = type;
      //   if (path) funcTemplate.properties.eventTrigger.path = path;
      //   funcTemplate.properties.eventTrigger.resource = resource;
      // }

      service.provider.compiledConfigurationTemplate.Resources.ServerlessCloudFunctions.push(funcTemplate);
    });

    return BbPromise.resolve();
  },
};

const validateHandlerProperty = (funcObject, functionName) => {
  if (!funcObject.handler) {
    const errorMessage = [
      `Missing "handler" property for function "${functionName}".`,
      ' Your function needs a "handler".',
      ' Please check the docs for more info.',
    ].join('');
    throw new Error(errorMessage);
  }
};

const validateEventsProperty = (funcObject, functionName) => {
  if (!funcObject.events || funcObject.events.length === 0) {
    const errorMessage = [
      `Missing "events" property for function "${functionName}".`,
      ' Your function needs at least one "event".',
      ' Please check the docs for more info.',
    ].join('');
    throw new Error(errorMessage);
  }

  if (funcObject.events.length > 1) {
    const errorMessage = [
      `The function "${functionName}" has more than one event.`,
      ' Only one event per function is supported.',
      ' Please check the docs for more info.',
    ].join('');
    throw new Error(errorMessage);
  }

  const supportedEvents = ['http', 'event'];
  const eventType = Object.keys(funcObject.events[0])[0];
  if (supportedEvents.indexOf(eventType) === -1) {
    const errorMessage = [
      `Event type "${eventType}" of function "${functionName}" not supported.`,
      ` supported event types are: ${supportedEvents.join(', ')}`,
    ].join('');
    throw new Error(errorMessage);
  }
};

const getFunctionTemplate = (funcObject, options, codeObject) => { //eslint-disable-line
  return {
    type: '',
    Region: options.region || 'gz',
    Properties: {
      functionName: funcObject.name,
      handler: funcObject.handler,
      description: funcObject.description,
      runtime: 'Nodejs6.10',
      memorySize: 128,
      timeout: 3,
      codeObject,
    }
  };
};
