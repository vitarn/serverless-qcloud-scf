'use strict'


module.exports = {
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
  },
}
