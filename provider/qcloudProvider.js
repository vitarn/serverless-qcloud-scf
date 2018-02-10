'use strict'

const path = require('path')
const fs = require('fs')
const os = require('os')
const ini = require('ini')

const BbPromise = require('bluebird')
const _ = require('lodash')
const QcloudAPI = require('qcloudapi-sdk')
const QcloudCOS = require('cos-nodejs-sdk-v5')
const { QcloudAPIGateway } = require('qcloud-apigateway')

const naming = require('./lib/naming')

class QcloudProvider {
  static getProviderName() {
    return naming.providerName
  }

  constructor(serverless, options) {
    this.naming = { provider: this }
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

    Object.assign(this.naming, naming)
  }

  isServiceSupported(service) {
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
    let credentials = this.serverless.service.provider.credentials
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
    }
  }

  get appId() {
    const { QCLOUD_APPID: appid } = process.env

    if (!appid) {
      this.serverless.cli.log(`WARN: Missing env "QCLOUD_APPID". It's required params for Qcloud COS bucket name.`)
      return ''
    }

    return appid
  }

  getQcloudAPIRegion(region) {
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

  get region() {
    const defaultRegion = 'gz'

    return _.get(this, 'options.region')
      || _.get(this, 'serverless.config.region')
      || _.get(this, 'serverless.service.provider.region')
      || defaultRegion
  }
}

module.exports = QcloudProvider
