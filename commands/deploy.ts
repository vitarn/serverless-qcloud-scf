import path from 'path'
import fs from 'fs'
import _ from 'lodash'
import chalk from 'chalk'
import { QcloudCommand } from '../lib'

export class QcloudDeploy extends QcloudCommand {
    service
    templates

    constructor(serverless, options) {
        super(serverless, options)

        this.hooks = {
            'before:deploy:deploy': async () => {
                await this.validate()
                await this.loadTemplates()
            },

            'deploy:deploy': async () => {
                await this.setupService()
                await this.uploadArtifacts()
                await this.setupFunctions()
                await this.setupEvents()
            },
        }
    }

    async loadTemplates() {
        const { serverless: { config, utils } } = this
        const createFilePath = path.join(config.servicePath, '.serverless', 'configuration-template-create.json')
        const updateFilePath = path.join(config.servicePath, '.serverless', 'configuration-template-update.json')

        this.templates = {
            create: utils.readFileSync(createFilePath),
            update: utils.readFileSync(updateFilePath),
        }
    }

    async setupService() {
        await this.createAPIGatewayIfNotExists() // Handle API Gateway first bcs we cannot deal same name services.
        await this.createBucketIfNotExists()
    }

    async createBucketIfNotExists() {
        const { templates, provider, serverless: { cli } } = this
        const bucket = templates.create.Resources.DeploymentBucket
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
        const { templates, provider, serverless: { cli } } = this
        const { APIGateway } = templates.create.Resources
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

            _.assign(templates.update.Resources.APIGateway, res)
        } else {
            cli.log(`API Gateway service "${APIGateway.serviceName}" already exists`)

            const ag = matchedServices[0]

            _.assign(templates.update.Resources.APIGateway, ag)

            if (ag.serviceDesc === APIGateway.serviceDesc && ag.protocol === APIGateway.protocol) return

            cli.log(`Updating api gateway service "${APIGateway.serviceName}"...`)

            const res = api.modifyService(_.assign({ serviceId: ag.serviceId }, APIGateway))
        }
    }

    async uploadArtifacts() {
        const { templates, provider, serverless: { cli } } = this
        const api = provider.sdk.cos
        const bucket = templates.update.Resources.DeploymentBucket
        const cosBucket = provider.getCOSBucket(bucket)

        cosBucket.Body = fs.createReadStream(cosBucket.Body)

        cli.log(`Uploading "${bucket.Key}" to OSS bucket "${bucket.Bucket}"...`)

        await api.putObjectAsync(cosBucket)
    }

    async setupFunctions() {
        const { provider, templates, serverless: { cli } } = this
        const sdk = provider.sdk.scf
        const bucket = templates.update.Resources.DeploymentBucket
        const functions = templates.update.Resources.CloudFunctions || []
        const cosBucket = provider.getCOSBucket(bucket)

        const codeObject = {
            cosBucketName: bucket.Bucket, // TODO: scf api append appid?
            cosObjectName: cosBucket.Key,
        }

        return Promise.all(functions.map(func => {
            return sdk.requestAsync(_.assign(
                _.pick(func, 'Region', 'functionName'),
                { Action: 'GetFunction' }
            ))
                .catch(err => {
                    cli.log('ERROR: Qcloud SCF GetFunction fail!')
                    throw err.error
                })
                .then(res => {
                    if (res.code !== 0) {
                        cli.log(`Creating function "${func.functionName}"...`)
                        return sdk.requestAsync(_.assign(
                            {},
                            func,
                            {
                                Action: 'CreateFunction',
                                Region: func.Region,
                                codeObject,
                            }
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
                            {},
                            func,
                            {
                                Action: 'UpdateFunction',
                                codeType: 'Cos',
                                codeObject,
                            }
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
        const { templates } = this

        this.apis = templates.update.Resources.APIGatewayApis
        this.triggers = []

        await this.createApisIfNeeded()
        await this.releaseAPIGateway()
    }

    async createApisIfNeeded() {
        if (!this.apis.length) return

        const { provider, templates, serverless: { cli } } = this
        const { Resources } = templates.update
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
        const { provider, options, service, templates, serverless: { cli } } = this
        const { APIGateway } = templates.update.Resources
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

        templates.update.Resources.APIGatewayRelease = _.assign({}, res, {
            environmentName: envMap[stage],
        })
    }
}
