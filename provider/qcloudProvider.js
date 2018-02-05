'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const ini = require('ini');

const BbPromise = require('bluebird');
const _ = require('lodash');
const QcloudAPI = require('qcloudapi-sdk');
const QcloudCOS = require('cos-nodejs-sdk-v5');

const constants = {
  providerName: 'qcloud'
};

class QcloudProvider {
  static getProviderName() {
    return constants.providerName;
  }

  constructor(serverless) {
    this.serverless = serverless;
    this.provider = this; // only load plugin in a Qcloud service context
    this.serverless.setProvider(constants.providerName, this);

    this.naming = {
      deploymentBucketName: 'serverless-qcloud-scf',
      deploymentBucketType: 'QCLOUD::COS::Bucket',
      cloudFunctionType: 'QCLOUD::SCF::Function',
    }

    this.sdk = {
      scf: this.getQcloudAPI({ serviceType: 'scf' }),
      apigateway: this.getQcloudAPI({ serviceType: 'apigateway' }),
      cos: this.getQcloudCOS(),
      cls: this.getQcloudAPI({ serviceType: 'cls' }),

      /**
       * the following is just a dummy assignment and should be updated once the official API is available
       * @see https://cloud.tencent.com/product/coc
       */
      coc: null,
    };
  }

  getQcloudAPI(options) {
    return new QcloudAPI(_.merge(this.getQcloudOptions(), options));
  }

  getQcloudCOS() {
    return new QcloudCOS(this.getQcloudOptions());
  }

  getQcloudOptions() {
    if (this._qcloudOptions) return this._qcloudOptions;

    const { QCLOUD_SECRETID: SecretId, QCLOUD_SECRETKEY: SecretKey } = process.env;

    if (SecretId && SecretKey) {
      this._qcloudOptions = {
        SecretId, SecretKey
      };

      return this._qcloudOptions;
    }

    let credentials = this.serverless.service.provider.credentials;
    const credParts = credentials.split(path.sep);

    if (credParts[0] === '~') {
      credParts[0] = os.homedir();
      credentials = credParts.reduce((memo, part) => path.join(memo, part), '');
    }

    const keyFileContent = fs.readFileSync(credentials).toString();
    const key = ini.parse(keyFileContent).default;

    this._qcloudOptions = {
      SecretId: key.qcloud_secretid,
      SecretKey: key.qcloud_secretkey,
    };

    return this._qcloudOptions;
  }

  getAppID() {
    const { QCLOUD_APPID: appid } = process.env;

    if (!appid) this.serverless.cli.log(`WARN: Missing env "QCLOUD_APPID". It's required params for Qcloud COS bucket name.`)

    return appid;
  }

  isServiceSupported(service) {
    if (!Object.keys(this.sdk).includes(service)) {
      const errorMessage = [
        `Unsupported service API "${service}".`,
        ` Supported service APIs are: ${Object.keys(this.sdk).join(', ')}`,
      ].join('');

      throw new Error(errorMessage);
    }
  }

  /**
   * Trans short region name to cos region name
   * @param {string} region 
   * @see https://cloud.tencent.com/document/product/436/6224
   */
  toCOSRegion(region) {
    const regionMap = {
      bj: 'ap-beijing',
      sh: 'ap-shanghai',
      gz: 'ap-guangzhou',
    }

    return regionMap[region]
  }

  /**
   * @param {string} name
   * @param {string} region
   * @returns {{name: string, region: string, exist: boolean, auth: boolean}}
   */
  headBucket(name, region) {
    const { serverless: { cli } } = this;

    cli.log(`Qcloud COS get bucket ${name} ${region}`)

    return new BbPromise((resolve, reject) => {
      this.sdk.cos.headBucket({
        Bucket: `${name}-${this.getAppID()}`,
        Region: this.toCOSRegion(region),
      }, (err, data) => {
        if (err) {
          cli.log(`Qcloud cos api error:`)
          console.log(err)
          reject(err)
        } else {
          resolve({
            name, region,
            exist: data.BucketExist,
            auth: data.BucketAuth,
          })
        }
      })
    })
  }
}

module.exports = QcloudProvider;
