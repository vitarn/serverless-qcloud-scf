import _ from 'lodash'
import { QcloudCommand } from './lib'

export class QcloudRemove extends QcloudCommand {
    constructor(serverless, options) {
        super(serverless, options)

        this.hooks = {
            'before:remove:remove': async () => {
                await this.validate()
                // await this.setDefaults()
                // await this.setDeploymentBucketName()
            },

            'remove:remove': async () => {
                await this.emptyDeploymentBucket()
                await this.removeDeployment()
            },
        }
    }

    async emptyDeploymentBucket() {
        const { provider, serverless: { cli } } = this

        cli.log(`Getting all objects in COS bucket "${provider.deploymentBucketName}"...`)

        try {
            const { Contents } = await provider.sdk.cos.getBucketAsync({
                Region: provider.longRegion,
                Bucket: provider.deploymentBucketNameWithAppId,
                Prefix: provider.artifactDirectoryPrefix,
            })

            if (Contents.length) {
                cli.log('Removing objects in COS bucket...')

                const { Deleted } = await provider.sdk.cos.deleteMultipleObjectAsync({
                    Region: provider.longRegion,
                    Bucket: provider.deploymentBucketNameWithAppId,
                    Objects: Contents.map(c => ({ Key: c.Key })),
                })

                cli.log(`Removed ${Deleted.length} objects`)
            }

            // Try delete bucket
            try {
                cli.log(`Trying delete COS bucket...`)
                await provider.sdk.cos.deleteBucketAsync({
                    Region: provider.longRegion,
                    Bucket: provider.deploymentBucketNameWithAppId,
                })
                cli.log(`Deleted bucket successful`)
            } catch (err) {
                provider.cli.error(err.message)
                cli.log(`Leave there since it's not empty!`)
            }
        } catch (err) {
            provider.cli.warn(err.error.Message)
        }
    }

    async removeDeployment() {
        const { serverless: { cli } } = this

        cli.log('Removing deployment...')

        await this.removeAPIGateway()
        await this.removeCloudFunctions()
    }

    async removeAPIGateway() {
        const { provider, serverless: { cli } } = this

        cli.log('Removing API Gateway...')

        const sdk = provider.sdk.apigateway.setRegion(provider.region)

        const { serviceStatusSet } = await sdk.describeServicesStatus({
            searchName: provider.apiGatewayServiceName,
            limit: 100,
        })
        const services = serviceStatusSet.filter(s => s.serviceName === provider.apiGatewayServiceName)

        if (services.length > 1) {
            cli.log(`WARN: Found ${services.length} API Gateway services! Cannot detect which is the right one.`)
            return
        }

        if (services.length === 0) {
            return
        }

        const [service] = services

        const { apiIdStatusSet } = await sdk.describeApisStatus({
            serviceId: service.serviceId,
            limit: 100,
        })
        const allApiRequests = this.getAllApiRequests()
        const apis = apiIdStatusSet.filter(api =>
            allApiRequests.some(a => a.method === api.method && a.path === api.path))

        if (apis.length > 0) {
            await Promise.all(apis.map(api => {
                cli.log(`Removing API ${api.apiName}...`)
                return sdk.deleteApi({
                    serviceId: service.serviceId,
                    apiId: api.apiId,
                })
            }))
        }

        // if (apis.length <= apiIdStatusSet.length) return

        const { environmentList } = await sdk.describeServiceEnvironmentList({ serviceId: service.serviceId })
        const envs = environmentList.filter(env => env.status)
        if (envs.length > 0) {
            await Promise.all(envs.map(env => {
                cli.log(`Unreleasing API Gateway service environment "${env.environmentName}"...`)
                return sdk.unReleaseService({
                    serviceId: service.serviceId,
                    environmentName: env.environmentName,
                })
            }))
        }

        cli.log(`Trying delete API Gateway service "${service.serviceName}"`)
        try {
            await sdk.deleteService({ serviceId: service.serviceId })
        } catch (err) {
            provider.cli.warn(err.message)
            cli.log(`Leave there since it's not empty!`)
        }
    }

    getAllApiRequests() {
        const { serverless: { service, cli } } = this

        return service.getAllFunctions().map((functionName) => {
            const funcObject = service.getFunction(functionName)
            const { http: { method, path } } = funcObject.events.find(event => event.http)
            return {
                method: _.toUpper(method),
                path: path.startsWith('/') ? path : `/${path}`,
            }
        })
    }

    async removeCloudFunctions() {
        const { provider, serverless: { service, cli } } = this
        const sdk = provider.sdk.scf
        const names = service.getAllFunctionsNames()

        await Promise.all(names.map(name => {
            cli.log(`Removing function ${name}`)
            return sdk.requestAsync({
                Region: provider.region,
                Action: 'DeleteFunction',
                functionName: name,
            })
        }))
    }
}
