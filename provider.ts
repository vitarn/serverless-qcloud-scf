import path from 'path'
import fs from 'fs'
import os from 'os'
import ini from 'ini'
import chalk from 'chalk'
import BbPromise from 'bluebird'
import _ from 'lodash'
import QcloudAPI from 'qcloudapi-sdk'
import QcloudCOS from 'cos-nodejs-sdk-v5'
import { QcloudAPIGateway } from 'qcloud-apigateway'
import { QcloudCommand } from './lib'

const naming = {
    providerName: 'qcloud' as 'qcloud',

    deploymentBucketPrefix: 'sls',
}

export class QcloudProvider extends QcloudCommand {
    static getProviderName() {
        return naming.providerName
    }

    naming
    sdk
    cli

    constructor(serverless, options = {}) {
        super(serverless, options)

        this.naming = Object.assign({ provider: this }, naming)
        this.options = options
        this.provider = this // only load plugin in a Qcloud service context
        this.serverless = serverless
        this.serverless.setProvider(naming.providerName, this)

        this.sdk = {
            scf: BbPromise.promisifyAll(this.getQcloudAPI({ serviceType: 'scf' })),
            apigateway: new QcloudAPIGateway(this.qcloudOptions),
            cos: BbPromise.promisifyAll(new QcloudCOS(this.qcloudOptions)),
            cls: BbPromise.promisifyAll(this.getQcloudAPI({ serviceType: 'cls' })),

            /**
             * the following is just a dummy assignment and should be updated once the official API is available
             * @see https://cloud.tencent.com/product/coc
             */
            coc: null,
        }

        this.cli = {
            warn(message) {
                serverless.cli.consoleLog(`Serverless: ${chalk.yellowBright(`[WARN] ${message}`)}`)
            },

            error(message) {
                serverless.cli.consoleLog(`Serverless: ${chalk.redBright(`[ERROR] ${message}`)}`)
            },
        }
    }

    isServiceSupported(service: string) {
        if (!Object.keys(this.sdk).includes(service)) {
            const errorMessage = [
                `Unsupported service API "${service}".`,
                ` Supported service APIs are: ${Object.keys(this.sdk).join(', ')}`,
            ].join('')

            throw new Error(errorMessage)
        }
    }

    getQcloudAPI(options) {
        return new QcloudAPI(_.merge({}, this.qcloudOptions, options))
    }

    _qcloudOptions

    get qcloudOptions() {
        if (this._qcloudOptions) return this._qcloudOptions

        const { QCLOUD_SECRETID: SecretId, QCLOUD_SECRETKEY: SecretKey } = process.env

        if (SecretId && SecretKey) {
            this._qcloudOptions = {
                SecretId, SecretKey
            }

            return this._qcloudOptions
        }

        this._qcloudOptions = this.credentials

        return this._qcloudOptions
    }

    get credentials() {
        // BUGFIX: If no secret in env. Fallback to here. But it maybe undefined in test.
        let credentials = _.get(this, 'serverless.service.provider.credentials')

        if (!credentials) return {}

        const credParts = credentials.split(path.sep)

        if (credParts[0] === '~') {
            credParts[0] = os.homedir()
            credentials = credParts.reduce((memo, part) => path.join(memo, part), '')
        }

        const keyFileContent = fs.readFileSync(credentials).toString()
        const key = ini.parse(keyFileContent).default

        return {
            SecretId: key.qcloud_secretid,
            SecretKey: key.qcloud_secretkey,
            AppId: key.qcloud_appid,
        }
    }

    get appId() {
        let { QCLOUD_APPID: appid } = process.env

        if (!appid) {
            appid = this.credentials.AppId

            if (!appid) {
                this.cli.warn(`Missing Qcloud AppId. It's required params for Qcloud COS bucket name.`)
                return ''
            }
        }

        return appid
    }

    getQcloudAPIRegion(region: string): string {
        const regionMap = {
            bj: 'ap-beijing-1',
            sh: 'ap-shanghai',
            gz: 'ap-guangzhou',
        }

        const apiRegion = regionMap[region]

        if (!apiRegion) throw new Error(`Qcloud scf not supported in region ${region}`)

        return apiRegion
    }

    getCOSBucket(bucket) {
        return Object.assign({}, bucket, {
            Bucket: `${bucket.Bucket}-${this.appId}`,
            Region: this.getQcloudAPIRegion(bucket.Region),
        })
    }

    get stage(): string {
        return _.get(this, 'options.stage')
            || _.get(this, 'serverless.config.stage')
            || _.get(this, 'serverless.service.provider.stage')
            || 'dev'
    }

    get releaseStage(): string {
        const stage = this.stage
        const stageMap = {
            dev: 'test',
            pre: 'prepub',
            prod: 'release'
        }

        const releaseStage = stageMap[stage]

        if (!releaseStage) throw new Error(`Unknown stage ${stage}. Supported stages is ${Object.keys(stageMap)}`)

        return releaseStage
    }

    get region(): string {
        return _.get(this, 'options.region')
            || _.get(this, 'serverless.config.region')
            || _.get(this, 'serverless.service.provider.region')
            || 'gz'
    }

    get longRegion(): string {
        const region = this.region
        const regionMap = {
            bj: 'ap-beijing-1',
            sh: 'ap-shanghai',
            gz: 'ap-guangzhou',
        }

        const longRegion = regionMap[region]

        if (!longRegion) throw new Error(`Qcloud scf not supported in region ${region}. Supported regions is ${Object.keys(regionMap)}`)

        return longRegion
    }

    get serviceName(): string {
        return _.get(this, 'serverless.service.service.name')
            || _.get(this, 'serverless.service.service')
            || 'unnamed'
    }

    get serviceWithStage() {
        return `${this.serviceName}-${this.stage}`
    }

    get deploymentBucketName() {
        const name = _.get(this, 'serverless.service.provider.deploymentBucket.name')
            || _.get(this, 'serverless.service.provider.deploymentBucket')
            || `${this.naming.deploymentBucketPrefix}-${this.region}-${this.serviceName}`

        return _.truncate(_.toLower(name).replace(/[^0-9a-z-]/g, '-'), {
            length: 40,
            omission: '',
        })
    }

    get deploymentBucketNameWithAppId() {
        return `${this.deploymentBucketName}-${this.appId}`
    }

    get artifactDirectoryPrefix() {
        return `serverless/${this.serviceName}/${this.stage}`
    }

    get apiGatewayServiceName() {
        const name = _.get(this, 'serverless.service.provider.apiGateway.name')
            || _.get(this, 'serverless.service.provider.apiGateway')
            || this.serviceWithStage

        return _.truncate(name.replace(/[^0-9a-z_]/ig, '_'), {
            length: 50,
            omission: '',
        })
    }

    get apiGatewayServiceProtocol(): string {
        return _.get(this, 'serverless.service.provider.apiGateway.protocol')
            || 'http&https'
    }

    get apiGatewayServiceDescription(): string {
        return _.get(this, 'serverless.service.provider.apiGateway.description')
            || `API Gateway for Serverless Function Compute service ${this.serviceName}, generated by the Serverless framework.`
    }

    async getAPIGatewayService(serviceName = this.apiGatewayServiceName, region = this.region) {
        const { serverless: { cli } } = this
        const sdk = this.sdk.apigateway.setRegion(region)

        const { serviceStatusSet } = await sdk.describeServicesStatus({
            searchName: serviceName,
            limit: 100,
        })
        const matchedServices = serviceStatusSet.filter(s => s.serviceName === serviceName)

        if (matchedServices.length > 1) {
            cli.error(`Qcloud returns ${serviceStatusSet.length} of "${serviceName}" api gateway services!
        Serverless cannot detect which is the right one.
        Consider modify another service name in your Qcloud Console.
      `)

            throw new Error(`Too many API Gateway services match name "${serviceName}"`)
        }

        return matchedServices[0]
    }
}
