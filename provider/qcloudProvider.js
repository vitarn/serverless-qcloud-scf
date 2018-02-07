'use strict'

const path = require('path')
const fs = require('fs')
const os = require('os')
const ini = require('ini')

const BbPromise = require('bluebird')
const _ = require('lodash')
const QcloudAPI = require('qcloudapi-sdk')
const QcloudCOS = require('cos-nodejs-sdk-v5')
const QcloudAPIGateway = require('qcloud-apigateway')

const naming = require('./lib/naming')

class QcloudProvider {
  static getProviderName() {
    return naming.providerName
  }

  constructor(serverless) {
    this.serverless = serverless
    this.provider = this // only load plugin in a Qcloud service context
    this.serverless.setProvider(naming.providerName, this)

    this.naming = naming

    this.sdk = {
      scf: BbPromise.promisifyAll(this.getQcloudAPI({ serviceType: 'scf' })),
      apigateway: new QcloudAPIGateway(this.getQcloudOptions()),
      cos: BbPromise.promisifyAll(new QcloudCOS(this.getQcloudOptions())),
      cls: BbPromise.promisifyAll(this.getQcloudAPI({ serviceType: 'cls' })),

      /**
       * the following is just a dummy assignment and should be updated once the official API is available
       * @see https://cloud.tencent.com/product/coc
       */
      coc: null,
    }
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
    return new QcloudAPI(_.merge(this.getQcloudOptions(), options))
  }

  getQcloudOptions() {
    if (this._qcloudOptions) return this._qcloudOptions

    const { QCLOUD_SECRETID: SecretId, QCLOUD_SECRETKEY: SecretKey } = process.env

    if (SecretId && SecretKey) {
      this._qcloudOptions = {
        SecretId, SecretKey
      }

      return this._qcloudOptions
    }

    const credentials = this.getQcloudCredentials()

    this._qcloudOptions = credentials

    return this._qcloudOptions
  }

  getQcloudCredentials() {
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

  getQcloudAppID() {
    const { QCLOUD_APPID: appid } = process.env

    if (!appid) this.serverless.cli.log(`WARN: Missing env "QCLOUD_APPID". It's required params for Qcloud COS bucket name.`)

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
      Bucket: `${bucket.Bucket}-${this.getQcloudAppID()}`,
      Region: this.getQcloudAPIRegion(bucket.Region),
    })
  }
}

module.exports = QcloudProvider
