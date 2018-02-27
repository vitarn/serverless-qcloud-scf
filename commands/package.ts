import path from 'path'
import fs from 'fs'
import fse from 'fs-extra'
import _ from 'lodash'
import { QcloudCommand } from '../lib'

function generateDeploymentTemplate(): any {
    return {
        "Description": "The Qcloud template for this Serverless application",
        "Resources": {
            "DeploymentBucket": {},
            "CloudFunctions": [],
            "APIGatewayApis": []
        }
    }
}

export class QcloudPackage extends QcloudCommand {
    constructor(serverless, options) {
        super(serverless, options)

        this.hooks = {
            'package:cleanup': async () => {
                await this.cleanupServerlessDir()
            },

            'before:package:initialize': async () => {
                await this.validate()
            },

            'package:initialize': async () => {
                await this.prepareDeployment()
            },

            'package:compileFunctions': async () => {
                await this.compileFunctions()
            },

            'package:finalize': async () => {
                await this.generateArtifactDirectoryName()
                await this.mergeServiceResources()
                await this.saveTemplateFile()
            },
        }
    }

    async cleanupServerlessDir() {
        const { serverless: { config: { servicePath } } } = this

        if (!servicePath) return

        const serverlessDirPath = path.join(servicePath, '.serverless')

        if (await fse.pathExists(serverlessDirPath)) {
            fse.remove(serverlessDirPath)
        }
    }

    async prepareDeployment() {
        const { provider, options, serverless: { service, utils, cli } } = this

        cli.log(`Prepare deployment template`)

        const deploymentTemplate = generateDeploymentTemplate()
        const Resources = deploymentTemplate.Resources = deploymentTemplate.Resources || {}
        const DeploymentBucket = Resources.DeploymentBucket = Resources.DeploymentBucket || {}
        const CloudFunctions = Resources.CloudFunctions = Resources.CloudFunctions || []
        const APIGateway = Resources.APIGateway = Resources.APIGateway || {}
        const APIGatewayApis = Resources.APIGatewayApis = Resources.APIGatewayApis || []

        Object.assign(DeploymentBucket, {
            Bucket: provider.deploymentBucketName,
            Region: provider.region,
            ACL: 'public-read',
        })

        const functionHasHTTP = service.getAllFunctions().some((functionName) => {
            const funcObject = service.getFunction(functionName)

            return funcObject.events && funcObject.events.some(event => event.http)
        })

        if (functionHasHTTP && _.isEmpty(deploymentTemplate.Resources.APIGateway)) {
            deploymentTemplate.Resources.APIGateway = {
                Region: provider.region,
                serviceName: provider.apiGatewayServiceName,
                protocol: provider.apiGatewayServiceProtocol,
                serviceDesc: provider.apiGatewayServiceDescription,
            }
        }

        service.provider.compiledConfigurationTemplate = deploymentTemplate
    }

    async saveTemplateFile() {
        const { serverless: { service, config, utils } } = this
        const filePath = path.join(config.servicePath, '.serverless', 'configuration-template.json')
        const fileContent = service.provider.compiledConfigurationTemplate

        utils.writeFileSync(filePath, fileContent)
    }

    async compileFunctions() {
        const { provider, options, serverless: { service, utils, cli } } = this

        const CloudFunctions = service.provider.compiledConfigurationTemplate.Resources.CloudFunctions = []

        service.getAllFunctions().forEach(functionName => {
            const funcObject = service.getFunction(functionName)

            cli.log(`Compiling function "${functionName}"...`)
            // "environment":{"variables":[{"key":"NODE_ENV","value":"production"},{"key":"ABC","value":"1"}]},"vpc":{"vpcId":"","subnetId":""}}
            const funcTemplate = {
                Region: provider.region,
                functionName: funcObject.name,
                code: funcObject.package.artifact,
                handler: funcObject.handler,
                description: funcObject.description,
                runtime: _.capitalize(_.get(funcObject, 'runtime')
                    || _.get(service, 'provider.runtime')
                    || 'Nodejs6.10'),
                memorySize: _.get(funcObject, 'memorySize')
                    || _.get(service, 'provider.memorySize')
                    || 128,
                timeout: _.get(funcObject, 'timeout')
                    || _.get(service, 'provider.timeout')
                    || 3,
                environment: !funcObject.environment
                    ? undefined
                    : {
                        variables: _.keys(funcObject.environment).map(key => ({ key, value: funcObject.environment[key] })),
                    },
            }

            CloudFunctions.push(_.omitBy(funcTemplate, _.isUndefined))

            if (funcObject.events) {
                this.validateEventsProperty(funcObject, funcTemplate.functionName)

                funcObject.events.forEach(event => {
                    if (event.http) {
                        this.compileAPIGateway(event.http, funcObject, funcTemplate)
                    }
                })
            }
        })
    }

    compileAPIGateway(http, funcObject, funcTemplate) {
        const { provider, options, serverless: { service, utils, cli } } = this
        const { APIGatewayApis } = service.provider.compiledConfigurationTemplate.Resources

        const apiTemplate = {
            Region: provider.region,
            apiName: http.name || funcObject.name,
            apiDesc: http.description,
            serviceType: 'SCF',
            serviceTimeout: funcTemplate.timeout,
            authRequired: http.private ? 'TRUE' : 'FALSE',
            requestConfig: {
                method: _.toUpper(http.method || 'GET'),
                path: typeof http.path === 'string' ? (http.path.startsWith('/') ? http.path : `/${http.path}`) : '/',
            },
            serviceScfFunctionName: funcObject.name,
            responseType: _.toUpper(http.responseType) || 'JSON',
            responseSuccessExample: http.responseSuccessExample,
            responseFailExample: http.responseFailExample,
            responseErrorCodes: !http.responseErrorCodes
                ? undefined
                : http.responseErrorCodes.map(({ code, message, description }) => ({
                    code: code,
                    msg: message,
                    desc: description,
                })),
        }

        cli.log(`Compiling api "${apiTemplate.apiName}"...`)

        APIGatewayApis.push(_.omitBy(apiTemplate, _.isUndefined))
    }

    validateEventsProperty(funcObject, functionName) {
        const { serverless: { cli } } = this

        if (!funcObject.events || funcObject.events.length === 0) {
            cli.log(`WARN: Missing "events" property for function "${functionName}".`)
        }

        const supportedEvents = ['http', 'timer', 'cos', 'cmq']

        funcObject.events.forEach(event => {
            const eventType = Object.keys(event).pop()

            if (!supportedEvents.includes(eventType)) {
                throw new Error(`Event type "${eventType}" of function "${functionName}" not supported.
          supported event types are: ${supportedEvents.join(', ')}`)
            }
        })
    }

    async generateArtifactDirectoryName() {
        const { provider, serverless: { service } } = this
        const date = new Date()
        const dateString = `${date.getTime().toString()}-${date.toISOString()}`
        const { artifact } = service.package
        const fileName = artifact ? artifact.split(path.sep).pop() : ''
        const { DeploymentBucket } = service.provider.compiledConfigurationTemplate.Resources

        Object.assign(DeploymentBucket, {
            Key: `${provider.artifactDirectoryPrefix}/${dateString}/${fileName}`,
            Body: artifact,
            ContentLength: artifact ? fs.statSync(service.package.artifact).size : undefined,
        })

        if (artifact) {
            DeploymentBucket.ContentLength = fs.statSync(service.package.artifact).size
        }
    }

    async mergeServiceResources() {
        const resources = this.serverless.service.resources

        if ((typeof resources === 'undefined') || _.isEmpty(resources)) return

        _.mergeWith(
            this.serverless.service.provider.compiledConfigurationTemplate,
            resources,
            (obj, src) => _.isArray(obj) ? obj.concat(src) : obj,
        )
    }
}
