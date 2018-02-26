import sinon from 'sinon'
import BbPromise from 'bluebird'
import { QcloudProvider } from './provider'
import { QcloudRemove } from './remove'
import Serverless from './test/serverless'

xdescribe('QcloudRemove', () => {
    let serverless
    let options
    let qcloudRemove

    beforeEach(() => {
        serverless = new Serverless()
        options = {
            stage: 'my-stage',
            region: 'my-region',
        }
        serverless.setProvider('qcloud', new QcloudProvider(serverless))
        qcloudRemove = new QcloudRemove(serverless, options)
    })

    describe('#constructor()', () => {
        it('should set the serverless instance', () => {
            expect(qcloudRemove.serverless).toEqual(serverless)
        })

        it('should set options if provided', () => {
            expect(qcloudRemove.options).toEqual(options)
        })

        it('should make the provider accessible', () => {
            expect(qcloudRemove.provider).toBeInstanceOf(QcloudProvider)
        })

        describe('hooks', () => {
            let validateStub
            let setDefaultsStub
            let setDeploymentBucketNameStub
            let emptyDeploymentBucketStub
            let removeDeploymentStub

            beforeEach(() => {
                validateStub = sinon.stub(qcloudRemove, 'validate')
                    .returns(BbPromise.resolve())
                setDefaultsStub = sinon.stub(qcloudRemove, 'setDefaults')
                    .returns(BbPromise.resolve())
                setDeploymentBucketNameStub = sinon.stub(qcloudRemove, 'setDeploymentBucketName')
                    .returns(BbPromise.resolve())
                emptyDeploymentBucketStub = sinon.stub(qcloudRemove, 'emptyDeploymentBucket')
                    .returns(BbPromise.resolve())
                removeDeploymentStub = sinon.stub(qcloudRemove, 'removeDeployment')
                    .returns(BbPromise.resolve())
            })

            afterEach(() => {
                qcloudRemove.validate.restore()
                qcloudRemove.setDefaults.restore()
                qcloudRemove.setDeploymentBucketName.restore()
                qcloudRemove.emptyDeploymentBucket.restore()
                qcloudRemove.removeDeployment.restore()
            })

            it('should run "before:remove:remove" promise chain', () => qcloudRemove
                .hooks['before:remove:remove']().then(() => {
                    expect(validateStub.calledOnce).toEqual(true)
                    expect(setDefaultsStub.calledAfter(validateStub)).toEqual(true)
                    expect(setDeploymentBucketNameStub.calledAfter(setDefaultsStub)).toEqual(true)
                }))

            it('should run "remove:remove" promise chain', () => qcloudRemove
                .hooks['remove:remove']().then(() => {
                    expect(emptyDeploymentBucketStub.calledOnce).toEqual(true)
                    expect(removeDeploymentStub.calledAfter(emptyDeploymentBucketStub)).toEqual(true)
                }))
        })
    })
})

xdescribe('EmptyDeploymentBucket', () => {
    let serverless
    let qcloudRemove
    let key

    beforeEach(() => {
        serverless = new Serverless()
        serverless.service = {
            service: 'my-service',
            provider: {
                deploymentBucketName: 'sls-my-service-dev-12345678',
            },
        }
        const options = {
            stage: 'dev',
            region: 'sh',
        }
        serverless.setProvider('qcloud', new QcloudProvider(serverless, options))
        qcloudRemove = new QcloudRemove(serverless, options)
        key = `serverless/${serverless.service.service}/${options.stage}`
    })

    describe('#emptyDeploymentBucket()', () => {
        let getObjectsToRemoveStub
        let removeObjectsStub

        beforeEach(() => {
            getObjectsToRemoveStub = sinon.stub(qcloudRemove, 'getObjectsToRemove')
                .returns(BbPromise.resolve())
            removeObjectsStub = sinon.stub(qcloudRemove, 'removeObjects')
                .returns(BbPromise.resolve())
        })

        afterEach(() => {
            qcloudRemove.getObjectsToRemove.restore()
            qcloudRemove.removeObjects.restore()
        })

        it('should run promise chain', () => qcloudRemove
            .emptyDeploymentBucket().then(() => {
                expect(getObjectsToRemoveStub.calledOnce).toEqual(true)
                expect(removeObjectsStub.calledAfter(getObjectsToRemoveStub))
            }))
    })

    describe('#getObjectsToRemove()', () => {
        let requestStub

        beforeEach(() => {
            requestStub = sinon.stub(qcloudRemove.provider, 'request')
        })

        afterEach(() => {
            qcloudRemove.provider.request.restore()
        })

        it('should resolve if there are no objects in the deployment bucket', () => {
            const response = {
                items: [],
            }
            requestStub.returns(BbPromise.resolve(response))

            return qcloudRemove.getObjectsToRemove().then((objects) => {
                expect(objects.length).toEqual(0)
                expect(objects).toEqual([])
                expect(requestStub.calledWithExactly(
                    'storage',
                    'objects',
                    'list',
                    {
                        bucket: 'sls-my-service-dev-12345678',
                    })).toEqual(true)
            })
        })

        it('should return all the objects in the deployment bucket', () => {
            const response = {
                items: [
                    {
                        bucket: 'sls-my-service-dev-12345678',
                        name: `${key}/151224711231-2016-08-18T15:42:00/artifact.zip`,
                    },
                    {
                        bucket: 'sls-my-service-dev-12345678',
                        name: `${key}/141264711231-2016-08-18T15:43:00/artifact.zip`,
                    },
                ],
            }
            requestStub.returns(BbPromise.resolve(response))

            return qcloudRemove.getObjectsToRemove().then((objects) => {
                expect(objects.length).toEqual(2)
                expect(objects).toContainEqual({
                    bucket: 'sls-my-service-dev-12345678',
                    name: `${key}/151224711231-2016-08-18T15:42:00/artifact.zip`,
                })
                expect(objects).toContainEqual({
                    bucket: 'sls-my-service-dev-12345678',
                    name: `${key}/141264711231-2016-08-18T15:43:00/artifact.zip`,
                })
                expect(requestStub.calledWithExactly(
                    'storage',
                    'objects',
                    'list',
                    {
                        bucket: 'sls-my-service-dev-12345678',
                    })).toEqual(true)
            })
        })
    })

    describe('#removeObjects()', () => {
        let requestStub
        let consoleLogStub

        beforeEach(() => {
            requestStub = sinon.stub(qcloudRemove.provider, 'request')
            consoleLogStub = sinon.stub(qcloudRemove.serverless.cli, 'log').returns({})
        })

        afterEach(() => {
            qcloudRemove.provider.request.restore()
            qcloudRemove.serverless.cli.log.restore()
        })

        it('should resolve if no objects should be removed', () => {
            const objectsToRemove = []

            return qcloudRemove.removeObjects(objectsToRemove).then(() => {
                expect(requestStub.calledOnce).toEqual(false)
                expect(consoleLogStub.calledOnce).toEqual(false)
            })
        })

        it('should remove all given objects', () => {
            const objectsToRemove = [
                {
                    bucket: 'sls-my-service-dev-12345678',
                    name: `${key}/151224711231-2016-08-18T15:42:00/artifact.zip`,
                },
                {
                    bucket: 'sls-my-service-dev-12345678',
                    name: `${key}/141264711231-2016-08-18T15:43:00/artifact.zip`,
                },
            ]

            requestStub.returns(BbPromise.resolve('removePromise'))

            return qcloudRemove.removeObjects(objectsToRemove).then((removePromises) => {
                expect(requestStub.called).toEqual(true)
                expect(consoleLogStub.calledOnce).toEqual(true)
                expect(removePromises).toEqual([
                    'removePromise',
                    'removePromise',
                ])
            })
        })
    })
})

xdescribe('RemoveDeployment', () => {
    let serverless
    let qcloudRemove
    let requestStub

    beforeEach(() => {
        serverless = new Serverless()
        serverless.service.service = 'my-service'
        serverless.service.provider = {
            project: 'my-project',
        }
        serverless.setProvider('google', new QcloudProvider(serverless))
        const options = {
            stage: 'dev',
            region: 'us-central1',
        }
        qcloudRemove = new QcloudRemove(serverless, options)
        requestStub = sinon.stub(qcloudRemove.provider, 'request')
    })

    afterEach(() => {
        qcloudRemove.provider.request.restore()
    })

    describe('#removeDeployment()', () => {
        let consoleLogStub
        let monitorDeploymentStub

        beforeEach(() => {
            consoleLogStub = sinon.stub(qcloudRemove.serverless.cli, 'log').returns({})
            monitorDeploymentStub = sinon.stub(qcloudRemove, 'monitorDeployment')
                .returns(BbPromise.resolve())
        })

        afterEach(() => {
            qcloudRemove.serverless.cli.log.restore()
            qcloudRemove.monitorDeployment.restore()
        })

        it('should remove and hand over to monitor the deployment', () => {
            const params = {
                project: 'my-project',
                deployment: 'sls-my-service-dev',
            }
            requestStub.returns(BbPromise.resolve())

            return qcloudRemove.removeDeployment().then(() => {
                expect(consoleLogStub.calledOnce).toEqual(true)
                expect(requestStub.calledWithExactly(
                    'deploymentmanager',
                    'deployments',
                    'delete',
                    params)).toEqual(true)
                expect(monitorDeploymentStub.calledWithExactly(
                    'sls-my-service-dev',
                    'remove',
                    5000)).toEqual(true)
            })
        })
    })
})

