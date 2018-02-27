import path from 'path'
import fs from 'fs'
import _ from 'lodash'
import chalk from 'chalk'
import { QcloudCommand } from '../lib'

export class QcloudDeploy extends QcloudCommand {
    service
    template

    constructor(serverless, options) {
        super(serverless, options)

        this.hooks = {
            'before:deploy:deploy': async () => {
                await this.validate()
                await this.loadTemplate()
            },

            'deploy:deploy': async () => {
                await this.setupService()
                await this.uploadArtifacts()
                await this.setupFunctions()
                await this.setupEvents()
            },

            'deploy:function:initialize': async () => {
                await this.checkIfFunctionExists()
            },

            'deploy:function:packageFunction': async () => {
                await this.serverless.pluginManager.spawn('package:function')
            },

            'deploy:function:deploy': async () => {
                await this.deployFunction()
            },
        }
    }

    /* deploy */

    async loadTemplate() {
        const { serverless: { config, utils } } = this
        const TemplatePath = path.join(config.servicePath, '.serverless', 'configuration-template.json')

        this.template = utils.readFileSync(TemplatePath)
    }

    async setupService() {
        await this.createAPIGatewayIfNotExists() // Handle API Gateway first bcs we cannot deal same name services.
        await this.createBucketIfNotExists()
    }

    async createBucketIfNotExists() {
        const { template, provider, serverless: { cli } } = this
        const bucket = template.Resources.DeploymentBucket
        const cosBucket = provider.getCOSBucket(bucket)
        const api = provider.sdk.cos

        const headBucket = await api.headBucketAsync(cosBucket)

        if (!headBucket.BucketExist) {
            cli.log(`Creating bucket "${bucket.Bucket}"...`)

            return api.putBucketAsync(cosBucket)
        } else {
            cli.log(`Bucket "${bucket.Bucket}" already exists`)

            if (headBucket.BucketAuth || !cosBucket.ACL) return

            cli.log(`Updating bucket "${bucket.Bucket}" ACL.`)
            return api.putBucketAclAsync(cosBucket)
        }
    }

    async createAPIGatewayIfNotExists() {
        const { template, provider, serverless: { cli } } = this
        const { APIGateway } = template.Resources
        const api = provider.sdk.apigateway.setRegion(APIGateway.Region)

        const services = await api.describeServicesStatus({
            searchName: APIGateway.serviceName,
            limit: 100,
        })
        const matchedServices = services.serviceStatusSet.filter(s => s.serviceName === APIGateway.serviceName)

        if (matchedServices.length > 1) {
            cli.log(`ERROR: Qcloud returns ${services.totalCount} of "${APIGateway.serviceName}" api gateway services!
        Serverless cannot detect which is the right one.
        Consider modify another service name in your Qcloud Console.
      `)

            throw new Error(`Too many API Gateway services match name "${APIGateway.serviceName}"`)
        } else if (matchedServices.length === 0) {
            cli.log(`Creating api gateway service "${APIGateway.serviceName}"...`)

            const res = await api.createService(APIGateway)

            _.assign(template.Resources.APIGateway, res)
        } else {
            cli.log(`API Gateway service "${APIGateway.serviceName}" already exists`)

            const ag = matchedServices[0]

            _.assign(template.Resources.APIGateway, ag)

            if (ag.serviceDesc === APIGateway.serviceDesc && ag.protocol === APIGateway.protocol) return

            cli.log(`Updating api gateway service "${APIGateway.serviceName}"...`)

            const res = api.modifyService(_.assign({ serviceId: ag.serviceId }, APIGateway))
        }
    }

    async uploadArtifacts() {
        const { template, provider, serverless: { cli } } = this
        const api = provider.sdk.cos
        const bucket = template.Resources.DeploymentBucket
        const cosBucket = provider.getCOSBucket(bucket)

        // Shared package
        if (cosBucket.Body) {
            cosBucket.Body = fs.createReadStream(cosBucket.Body)

            cli.log(`Uploading "${bucket.Key}" to OSS bucket "${bucket.Bucket}"...`)

            return api.putObjectAsync(cosBucket)
        }

        // There are 2 ways reach here: 1. package individually true. 2. serverless-webpack

        const codes = _.uniq<string>(template.Resources.CloudFunctions.map(func => path.resolve(func.code)))

        return Promise.all(codes.map(code => {
            const zipName = path.basename(code)
            const copyBucket = Object.assign({}, cosBucket, {
                Key: `${cosBucket.Key}${zipName}`,
                Body: fs.createReadStream(code),
                ContentLength: fs.statSync(code).size,
            })

            cli.log(`Uploading "${zipName}" to OSS bucket "${bucket.Bucket}"...`)

            return api.putObjectAsync(copyBucket)
        }))
    }

    async setupFunctions() {
        const { provider, template, serverless: { cli } } = this
        const sdk = provider.sdk.scf
        const bucket = template.Resources.DeploymentBucket
        const functions = template.Resources.CloudFunctions || []

        return Promise.all(functions.map(func => {
            const codeObject = {
                cosBucketName: bucket.Bucket, // TODO: scf api append appid?
                cosObjectName: bucket.Key,
            }

            if (bucket.Key.endsWith('/')) {
                codeObject.cosObjectName += path.basename(func.code)
            }

            return sdk.requestAsync(_.assign(
                { Action: 'GetFunction' },
                _.pick(func, 'Region', 'functionName'),
            ))
                .catch(err => {
                    cli.log('ERROR: Qcloud SCF GetFunction fail!')
                    throw err.error
                })
                .then(res => {
                    if (res.code > 0) {
                        cli.log(`Creating function "${func.functionName}"...`)
                        return sdk.requestAsync(_.assign(
                            {
                                Action: 'CreateFunction',
                                Region: func.Region,
                                codeObject,
                            },
                            _.omit(func, 'code'),
                        ))
                            .catch(err => {
                                cli.log('ERROR: Qcloud SCF CreateFunction fail!')
                                throw err.error
                            })
                            .then(res => {
                                if (res.code != 0) {
                                    cli.log('ERROR: Qcloud SCF CreateFunction fail!')
                                    const error = new Error(res.message)
                                    error.name = res.codeDesc
                                    throw error
                                }
                            })
                    } else {
                        cli.log(`Updating function "${func.functionName}"...`)

                        return sdk.requestAsync(_.assign(
                            {
                                Action: 'UpdateFunction',
                                codeType: 'Cos',
                                codeObject,
                            },
                            func,
                        ))
                            .catch(err => {
                                cli.log('ERROR: Qcloud SCF UpdateFunction fail!')
                                throw err.error
                            })
                    }
                })
        }))
    }

    apis
    triggers

    async setupEvents() {
        const { template } = this

        this.apis = template.Resources.APIGatewayApis
        this.triggers = []

        await this.createApisIfNeeded()
        await this.releaseAPIGateway()
    }

    async createApisIfNeeded() {
        if (!this.apis.length) return

        const { provider, template, serverless: { cli } } = this
        const { Resources } = template
        const { apigateway } = provider.sdk
        const { serviceId } = Resources.APIGateway

        return Promise.all(this.apis.map(async api => {
            _.assign(api, { serviceId })

            const res = await apigateway.describeApisStatus({
                serviceId,
                searchName: api.requestConfig.path,
                limit: 100,
            })

            const existsApis = res.apiIdStatusSet.filter(
                a => a.method === api.requestConfig.method && a.path === api.requestConfig.path
            )

            // Qcloud disallow same "METHOD /path". So existsApis length is zero or one.
            if (existsApis.length === 0) {
                cli.log(`Creating api ${api.requestConfig.path}...`)

                const res = await apigateway.createApi(api)

                _.assign(api, res)
            } else {
                cli.log(`Updating api ${api.requestConfig.path}...`)

                // Assign here bcs modifiApi return {}
                _.assign(api, _.pick(existsApis[0], 'apiId', 'serviceId'))

                const res = await apigateway.modifyApi(api)
            }
        }))
    }

    async releaseAPIGateway() {
        const { provider, options, service, template, serverless: { cli } } = this
        const { APIGateway } = template.Resources
        const { apigateway } = provider.sdk
        const stage = _.get(options, 'stage')
            || _.get(service, 'provider.stage')
            || 'dev'

        cli.log(`Releasing API Gateway service ${APIGateway.serviceName}...`)

        // 'test' | 'prepub' | 'release'
        const envMap = {
            dev: 'test',
            pre: 'prepub',
            prod: 'release'
        }

        const res = await apigateway.releaseService({
            serviceId: APIGateway.serviceId,
            environmentName: envMap[stage],
            releaseDesc: 'Release by serverless'
        })

        template.Resources.APIGatewayRelease = _.assign({}, res, {
            environmentName: envMap[stage],
        })
    }

    /* deploy function */

    async checkIfFunctionExists() {
        const { options, provider, serverless: { service, cli } } = this
        const sdk = provider.sdk.scf
        const funcObj = service.getFunction(options.function)

        const res = await sdk.requestAsync({
            Action: 'GetFunction',
            Region: provider.region,
            functionName: funcObj.name,
        })

        if (res.code !== 0) {
            const errorMessage = [
                `The function "${options.function}" you want to update is not yet deployed.`,
                ' Please run "serverless deploy" to deploy your service.',
                ' After that you can redeploy your services functions with the',
                ' "serverless deploy function" command.',
            ].join('')
            throw new Error(errorMessage)
        }
    }

    async deployFunction() {
        const { options, provider, serverless: { service, config, cli } } = this
        const sdk = provider.sdk.scf
        const funcObj = service.getFunction(options.function)
        const artifactFileName = `${options.function}.zip`

        let artifactFilePath
        if (_.has(funcObj, ['package', 'artifact'])) {
            artifactFilePath = funcObj.package.artifact
        } else {
            const packagePath = options.package ||
                service.package.path ||
                path.join(config.servicePath || '.', '.serverless')

            artifactFilePath = service.package.artifact ||
                path.join(packagePath, artifactFileName)
        }

        const stats = fs.statSync(artifactFilePath)

        if (stats.size > 10 * 1000 * 1000) {
            const errorMessage = [
                `The function zip "${artifactFileName}" you want to update is big than 10M.`,
                ' Qcloud not allow upload directly.',
                ' Consider reduce your package size by serverless-webpack.',
            ].join('')
            throw new Error(errorMessage)
        }

        cli.log(`Uploading function: ${options.function} (${Math.round(stats.size / 1000) / 1000}M)...`)

        const params = {
            Action: 'UpdateFunction',
            Region: provider.region,
            functionName: funcObj.name,
            code: `@${fs.readFileSync(artifactFilePath).toString('base64')}`,
            handler: funcObj.handler,
            description: funcObj.description,
            memorySize: funcObj.memorySize || _.get(service, 'provider.memorySize'),
            timeout: funcObj.timeout || _.get(service, 'provider.timeout'),
            runtime: _.capitalize(funcObj.runtime || _.get(service, 'provider.runtime')),
            codeType: 'Zipfile',
        }

        const res = await sdk.requestAsync(params)

        if (res.code > 0) {
            const error = new Error(res.message)
            error.name = res.codeDesc

            throw error
        }

        cli.log(`Successfully deployed function: ${options.function}`)
    }
}
