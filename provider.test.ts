import fs from 'fs'
import os from 'os'
import sinon from 'sinon'
import QcloudApi from 'qcloudapi-sdk'
import { QcloudProvider } from './provider'
import { Serverless } from './test/serverless'

describe('QcloudProvider', () => {
    let readFileSyncStub
    let qcloudProvider
    let serverless
    let setProviderStub
    let homedirStub

    beforeEach(() => {
        serverless = new Serverless()
        serverless.service = {
            service: 'my-service',
            provider: {
                project: 'example-project',
                credentials: '/root/.qcloudcli/credentials',
            },
        }
        setProviderStub = sinon.stub(serverless, 'setProvider').returns(void 0)
        readFileSyncStub = sinon.stub(fs, 'readFileSync')
            .returns('[default]\nqcloud_secretkey = mykey\nqcloud_secretid = myid')
        homedirStub = sinon.stub(os, 'homedir')
            .returns('/root')
        qcloudProvider = new QcloudProvider(serverless, {
            region: 'sh',
        })
    })

    afterEach(() => {
        // serverless.setProvider.restore()
        // (fs.readFileSync as any).restore()
        // (os.homedir as any).restore()
        setProviderStub.restore()
        readFileSyncStub.restore()
        homedirStub.restore()
    })

    describe('#getProviderName()', () => {
        it('should return the provider name', () => {
            expect(QcloudProvider.getProviderName()).toEqual('qcloud')
        })
    })

    describe('#constructor()', () => {
        it('should store an instance of serverless', () => {
            expect(qcloudProvider.serverless).toBeInstanceOf(Serverless)
        })

        it('should store an instance of itself', () => {
            expect(qcloudProvider.provider).toBeInstanceOf(QcloudProvider)
        })

        it('should set the provider with the Serverless instance', () => {
            expect(setProviderStub.calledOnce).toEqual(true)
        })

        it('should set the used SDKs', () => {
            expect(qcloudProvider.sdk.scf)
                .toBeDefined()
            expect(qcloudProvider.sdk.apigateway)
                .toBeDefined()
            expect(qcloudProvider.sdk.cos)
                .toBeDefined()
            expect(qcloudProvider.sdk.cls)
                .toBeDefined()
        })
    })

    describe('#isServiceSupported()', () => {
        it('should do nothing if service is available', () => {
            expect(() => {
                qcloudProvider.isServiceSupported('scf')
            }).not.toThrow(Error)
        })

        it('should throw error if service is not Supported', () => {
            expect(() => {
                qcloudProvider.isServiceSupported('unsupported')
            }).toThrow(Error)
        })
    })

    describe('#stage', () => {
        it('should prefer options over config or provider', () => {
            qcloudProvider.options = { stage: 'optionsStage' }
            serverless.config = { stage: 'configStage' }
            serverless.service.provider = { stage: 'providerStage' }

            expect(qcloudProvider.stage).toEqual('optionsStage')
        })

        it('should prefer config over provider in lieu of options', () => {
            serverless.config = { stage: 'configStage' }
            serverless.service.provider = { stage: 'providerStage' }

            expect(qcloudProvider.stage).toEqual('configStage')
        })

        it('should use provider in lieu of options and config', () => {
            serverless.service.provider = { stage: 'providerStage' }

            expect(qcloudProvider.stage).toEqual('providerStage')
        })

        it('should use the default dev in lieu of options, config, and provider', () => {
            expect(qcloudProvider.stage).toEqual('dev')
        })
    })

    describe('#region', () => {
        it('should prefer options over config or provider', () => {
            qcloudProvider.options = { region: 'optionsRegion' }
            serverless.config = { region: 'configRegion' }
            serverless.service.provider = { region: 'providerRegion' }

            expect(qcloudProvider.region).toEqual('optionsRegion')
        })

        it('should prefer config over provider in lieu of options', () => {
            qcloudProvider.options = {}
            serverless.config = { region: 'configRegion' }
            serverless.service.provider = { region: 'providerRegion' }

            expect(qcloudProvider.region).toEqual('configRegion')
        })

        it('should use provider in lieu of options and config', () => {
            qcloudProvider.options = {}
            serverless.config = {}
            serverless.service.provider = { region: 'providerRegion' }

            expect(qcloudProvider.region).toEqual('providerRegion')
        })

        it('should use the default gz in lieu of options, config, and provider', () => {
            qcloudProvider.options = {}
            serverless.config = {}
            serverless.service.provider = {}
            expect(qcloudProvider.region).toEqual('gz')
        })
    })

    describe('#serviceName', () => {
        it('should return service name or unnamed', () => {
            expect(qcloudProvider.serviceName).toEqual('my-service')
        })
    })

    describe('#serviceWithStage', () => {
        it('should return service name and stage join with "-"', () => {
            expect(qcloudProvider.serviceWithStage).toEqual('my-service-dev')
        })
    })

    describe('#deploymentBucketName', () => {
        it('should use the service name and region as suffix', () => {
            expect(qcloudProvider.deploymentBucketName).toEqual('sls-sh-my-service')
        })

        it('should to lowercase and replace invalid charactors to "-"', () => {
            serverless.service.service = 'S@m4_bad'

            expect(qcloudProvider.deploymentBucketName).toEqual('sls-sh-s-m4-bad')
        })

        it('should truncate if long than 40', () => {
            serverless.service.service = 's'.repeat(40)

            expect(qcloudProvider.deploymentBucketName).toEqual('sls-sh-' + 's'.repeat(33))
        })
    })

    describe('#artifactDirectoryPrefix', () => {
        it('should gen a prefix for artifact dir bucket key', () => {
            expect(qcloudProvider.artifactDirectoryPrefix).toEqual('serverless/my-service/dev')
        })

        it('should to lowercase and replace invalid charactors to "-"', () => {
            serverless.service.service = 'S@m4_bad'

            expect(qcloudProvider.deploymentBucketName).toEqual('sls-sh-s-m4-bad')
        })

        it('should truncate if long than 40', () => {
            serverless.service.service = 's'.repeat(40)

            expect(qcloudProvider.deploymentBucketName).toEqual('sls-sh-' + 's'.repeat(33))
        })
    })

    describe('#apiGatewayServiceName', () => {
        it('should use provider apiGateway name', () => {
            serverless.service.provider = { apiGateway: { name: 'my_api_gateway' } }

            expect(qcloudProvider.apiGatewayServiceName).toEqual('my_api_gateway')
        })

        it('should use provider apiGateway', () => {
            serverless.service.provider = { apiGateway: 'my_api_gateway' }

            expect(qcloudProvider.apiGatewayServiceName).toEqual('my_api_gateway')
        })

        it('should replace invalid charactors to "-"', () => {
            serverless.service.provider = { apiGateway: 'S@m4-bad' }

            expect(qcloudProvider.apiGatewayServiceName).toEqual('S_m4_bad')
        })

        it('should truncate if long than 40', () => {
            serverless.service.provider = { apiGateway: 's'.repeat(51) }

            expect(qcloudProvider.apiGatewayServiceName).toEqual('s'.repeat(50))
        })

        it('should gen api gateway service name with service and stage', () => {
            expect(qcloudProvider.apiGatewayServiceName).toEqual('my_service_dev')
        })
    })

    describe('#apiGatewayServiceProtocol', () => {
        it('should use provider apiGateway protocol', () => {
            serverless.service.provider = { apiGateway: { protocol: 'https' } }

            expect(qcloudProvider.apiGatewayServiceProtocol).toEqual('https')
        })

        it('should use default api gateway protocol', () => {
            serverless.service.provider = { apiGateway: {} }

            expect(qcloudProvider.apiGatewayServiceProtocol).toEqual('http&https')
        })
    })

    describe('#apiGatewayServiceDescription', () => {
        it('should use provider apiGateway description', () => {
            serverless.service.provider = { apiGateway: { description: 'my api group' } }

            expect(qcloudProvider.apiGatewayServiceDescription).toEqual('my api group')
        })

        it('should gen a default api gateway description', () => {
            serverless.service.provider = { apiGateway: {} }

            expect(qcloudProvider.apiGatewayServiceDescription).toBeDefined()
        })
    })
})
