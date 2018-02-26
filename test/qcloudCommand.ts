// mock to test functionality in a command unrelated matter
// this mean that not e.g. qcloudDeploy but the more abstract qcloudCommand can be used
export class QCloudCommand {
  serverless
  options
  provider
  testSubject
  
  constructor(serverless, options, testSubject) {
    this.options = options
    this.serverless = serverless
    this.provider = this.serverless.getProvider('qcloud')

    Object.assign(
      this,
      testSubject)
  }
}
