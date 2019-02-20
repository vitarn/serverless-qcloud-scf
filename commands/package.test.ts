import path from 'path'
import fs from 'fs'
import fse from 'fs-extra'
import sinon from 'sinon'
import { QcloudProvider } from '../provider'
import { QcloudPackage } from './package'
import { Serverless } from '../test/serverless'

describe('QcloudPackage', () => {
    describe('QcloudPackage', () => {
        let serverless
        let options
        let qcloudPackage

        beforeEach(() => {
            serverless = new Serverless()
            options = {
                stage: 'my-stage',
                region: 'my-region',
            }
            serverless.setProvider('qcloud', new QcloudProvider(serverless))
            qcloudPackage = new QcloudPackage(serverless, options)
        })

        describe('#constructor()', () => {
            it('should set the serverless instance', () => {
                expect(qcloudPackage.serverless).toEqual(serverless)
            })

            it('should set options if provided', () => {
                expect(qcloudPackage.options).toEqual(options)
            })

            it('should make the provider accessible', () => {
                expect(qcloudPackage.provider).toBeInstanceOf(QcloudProvider)
            })

            describe('hooks', () => {
                let cleanupServerlessDirStub
                let validateStub
                let prepareDeploymentStub
                let generateArtifactDirectoryNameStub
                let compileFunctionsStub
                let mergeServiceResourcesStub
                let saveTemplateFileStub

                beforeEach(() => {
                    cleanupServerlessDirStub = sinon.stub(qcloudPackage, 'cleanupServerlessDir').returns(Promise.resolve())
                    validateStub = sinon.stub(qcloudPackage, 'validate').returns(Promise.resolve())
                    prepareDeploymentStub = sinon.stub(qcloudPackage, 'prepareDeployment').returns(Promise.resolve())
                    generateArtifactDirectoryNameStub = sinon.stub(qcloudPackage, 'generateArtifactDirectoryName').returns(Promise.resolve())
                    compileFunctionsStub = sinon.stub(qcloudPackage, 'compileFunctions').returns(Promise.resolve())
                    mergeServiceResourcesStub = sinon.stub(qcloudPackage, 'mergeServiceResources').returns(Promise.resolve())
                    saveTemplateFileStub = sinon.stub(qcloudPackage, 'saveTemplateFile').returns(Promise.resolve())
                })

                afterEach(() => {
                    qcloudPackage.cleanupServerlessDir.restore()
                    qcloudPackage.validate.restore()
                    qcloudPackage.prepareDeployment.restore()
                    qcloudPackage.generateArtifactDirectoryName.restore()
                    qcloudPackage.compileFunctions.restore()
                    qcloudPackage.mergeServiceResources.restore()
                    qcloudPackage.saveTemplateFile.restore()
                })

                it('should run "package:cleanup" promise chain', () => qcloudPackage
                    .hooks['package:cleanup']().then(() => {
                        expect(cleanupServerlessDirStub.calledOnce).toEqual(true)
                    }))

                it('should run "before:package:initialize" promise chain', () => qcloudPackage
                    .hooks['before:package:initialize']().then(() => {
                        expect(validateStub.calledOnce).toEqual(true)
                        // expect(setDefaultsStub.calledAfter(validateStub)).toEqual(true)
                    }))

                it('should run "package:initialize" promise chain', () => qcloudPackage
                    .hooks['package:initialize']().then(() => {
                        expect(prepareDeploymentStub.calledOnce).toEqual(true)
                    }))

                it('should run "package:compileFunctions" promise chain', () => qcloudPackage
                    .hooks['package:compileFunctions']().then(() => {
                        expect(compileFunctionsStub.calledOnce).toEqual(true)
                    }))

                it('should run "package:finalize" promise chain', () => qcloudPackage
                    .hooks['package:finalize']().then(() => {
                        expect(generateArtifactDirectoryNameStub.calledOnce).toEqual(true)
                        expect(mergeServiceResourcesStub.calledAfter(generateArtifactDirectoryNameStub)).toEqual(true)
                        expect(saveTemplateFileStub.calledAfter(mergeServiceResourcesStub)).toEqual(true)
                    }))
            })
        })
    })

    describe('CleanupServerlessDir', () => {
        let serverless
        let qcloudPackage
        let pathExistsStub
        let removeStub

        beforeEach(() => {
            serverless = new Serverless()
            serverless.service.service = 'my-service'
            serverless.config = {
                servicePath: false,
            }
            serverless.setProvider('qcloud', new QcloudProvider(serverless))
            const options = {
                stage: 'dev',
                region: 'sh',
            }
            qcloudPackage = new QcloudPackage(serverless, options)
            pathExistsStub = sinon.stub(fse, 'pathExists')
            removeStub = sinon.stub(fse, 'remove').returns(void 0)
        })

        afterEach(() => {
            pathExistsStub.restore()
            removeStub.restore()
        })

        describe('#cleanupServerlessDir()', () => {
            it('should resolve if no servicePath is given', async () => {
                qcloudPackage.serverless.config.servicePath = false

                // pathExistsStub.returns(void 0)

                await qcloudPackage.cleanupServerlessDir()

                expect(pathExistsStub.calledOnce).toEqual(false)
                expect(removeStub.calledOnce).toEqual(false)
            })

            it('should remove the .serverless directory if it exists', async () => {
                const serviceName = qcloudPackage.serverless.service.service
                qcloudPackage.serverless.config.servicePath = serviceName
                const serverlessDirPath = path.join(serviceName, '.serverless')

                pathExistsStub.returns(Promise.resolve(true))

                await qcloudPackage.cleanupServerlessDir()

                expect(pathExistsStub.calledWithExactly(serverlessDirPath)).toEqual(true)
                expect(removeStub.calledWithExactly(serverlessDirPath)).toEqual(true)
            })

            it('should not remove the .serverless directory if does not exist', async () => {
                const serviceName = qcloudPackage.serverless.service.service
                qcloudPackage.serverless.config.servicePath = serviceName
                const serverlessDirPath = path.join(serviceName, '.serverless')

                pathExistsStub.returns(Promise.resolve(false))

                await qcloudPackage.cleanupServerlessDir()

                expect(pathExistsStub.calledWithExactly(serverlessDirPath)).toEqual(true)
                expect(removeStub.calledWithExactly(serverlessDirPath)).toEqual(false)
            })
        })
    })

    describe('PrepareDeployment', () => {
        let coreResources
        let serverless
        let qcloudPackage

        beforeEach(() => {
            serverless = new Serverless()
            serverless.service.service = 'my-service'
            serverless.service.provider = {
                compiledConfigurationTemplate: coreResources,
                deploymentBucket: 'my-bucket',
            }
            const options = {
                stage: 'dev',
                region: 'sh',
            }
            serverless.setProvider('qcloud', new QcloudProvider(serverless, options))
            qcloudPackage = new QcloudPackage(serverless, options)
        })

        describe('#prepareDeployment()', () => {
            it('should load the core configuration template into the serverless instance', async () => {
                const expectedCompiledConfiguration = {
                    Description: 'The Qcloud template for this Serverless application',
                    Resources: {
                        DeploymentBucket: {
                            Bucket: 'my-bucket',
                            Region: 'sh',
                            ACL: 'public-read',
                        },
                        CloudFunctions: [],
                        APIGateway: {},
                        APIGatewayApis: [],
                        FunctionTriggers: [],
                    },
                }

                await qcloudPackage.prepareDeployment()

                expect(serverless.service.provider.compiledConfigurationTemplate).toEqual(expectedCompiledConfiguration)
            })
        })
    })

    describe('saveTemplateFile', () => {
        let serverless
        let qcloudPackage
        let writeFileSyncStub

        beforeEach(() => {
            serverless = new Serverless()
            serverless.service.service = 'my-service'
            serverless.service.provider = {
                compiledConfigurationTemplate: {
                    foo: 'bar',
                },
            }
            serverless.config = {
                servicePath: 'foo/my-service',
            }
            serverless.setProvider('qcloud', new QcloudProvider(serverless))
            const options = {
                stage: 'dev',
                region: 'sh',
            }
            qcloudPackage = new QcloudPackage(serverless, options)
            writeFileSyncStub = sinon.stub(qcloudPackage.serverless.utils, 'writeFileSync')
        })

        afterEach(() => {
            qcloudPackage.serverless.utils.writeFileSync.restore()
        })

        describe('#saveTemplateFile()', () => {
            it('should write the template file into the services .serverless directory', () => {
                const filePath = path.join(
                    qcloudPackage.serverless.config.servicePath,
                    '.serverless',
                    'configuration-template.json',
                )

                qcloudPackage.saveTemplateFile()

                expect(writeFileSyncStub.calledWithExactly(
                    filePath,
                    qcloudPackage.serverless.service.provider.compiledConfigurationTemplate,
                )).toEqual(true)
            })
        })
    })

    describe('CompileFunctions', () => {
        let serverless
        let qcloudPackage
        let consoleLogStub

        beforeEach(() => {
            serverless = new Serverless()
            serverless.service.service = 'my-service'
            serverless.service.package = {
                artifact: 'artifact.zip',
                artifactDirectoryName: 'some-path',
            }
            serverless.service.provider = {
                compiledConfigurationTemplate: {
                    Resources: {
                        CloudFunctions: [],
                        APIGatewayApis: [],
                    },
                },
                deploymentBucket: 'my-bucket',
            }
            const options = {
                stage: 'dev',
                region: 'sh',
            }
            serverless.setProvider('qcloud', new QcloudProvider(serverless, options))
            qcloudPackage = new QcloudPackage(serverless, options)
            consoleLogStub = sinon.stub(qcloudPackage.serverless.cli, 'log').returns(void 0)
        })

        afterEach(() => {
            qcloudPackage.serverless.cli.log.restore()
        })

        describe('#compileFunctions()', () => {
            it('should throw an error if the functions event is not supported', async () => {
                qcloudPackage.serverless.service.functions = {
                    func1: {
                        handler: 'func1',
                        events: [
                            { invalidEvent: 'event1' },
                        ],
                    },
                }

                await expect(qcloudPackage.compileFunctions()).rejects.toThrow(Error)
            })

            it('should set the memory size based on the functions configuration', async () => {
                qcloudPackage.serverless.service.functions = {
                    func1: {
                        handler: 'func1',
                        memorySize: 768,
                        events: [
                            { http: 'foo' },
                        ],
                    },
                }

                await qcloudPackage.compileFunctions()

                const { compiledConfigurationTemplate } = qcloudPackage.serverless.service.provider

                expect(compiledConfigurationTemplate.Resources.CloudFunctions[0].memorySize).toBe(768)
            })

            it('should set the memory size based on the provider configuration', async () => {
                qcloudPackage.serverless.service.functions = {
                    func1: {
                        handler: 'func1',
                        events: [
                            { http: 'foo' },
                        ],
                    },
                }
                qcloudPackage.serverless.service.provider.memorySize = 768

                const compiledResources = [{
                    type: 'cloudfunctions.v1beta2.function',
                    name: 'my-service-dev-func1',
                    properties: {
                        location: 'us-central1',
                        function: 'func1',
                        availableMemoryMb: 1024,
                        timeout: '60s',
                        sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
                        httpsTrigger: {
                            url: 'foo',
                        },
                    },
                }]

                await qcloudPackage.compileFunctions()

                const { compiledConfigurationTemplate } = qcloudPackage.serverless.service.provider

                expect(compiledConfigurationTemplate.Resources.CloudFunctions[0].memorySize).toBe(768)
            })

            it('should set the timout based on the functions configuration', async () => {
                qcloudPackage.serverless.service.functions = {
                    func1: {
                        handler: 'func1',
                        timeout: 119,
                        events: [
                            { http: 'foo' },
                        ],
                    },
                }

                await qcloudPackage.compileFunctions()

                const { compiledConfigurationTemplate } = qcloudPackage.serverless.service.provider

                expect(compiledConfigurationTemplate.Resources.CloudFunctions[0].timeout).toBe(119)
            })

            it('should set the timeout based on the provider configuration', async () => {
                qcloudPackage.serverless.service.functions = {
                    func1: {
                        handler: 'func1',
                        events: [
                            { http: 'foo' },
                        ],
                    },
                }
                qcloudPackage.serverless.service.provider.timeout = 119

                await qcloudPackage.compileFunctions()

                const { compiledConfigurationTemplate } = qcloudPackage.serverless.service.provider

                expect(compiledConfigurationTemplate.Resources.CloudFunctions[0].timeout).toBe(119)
            })

            it('should compile "http" events properly', async () => {
                qcloudPackage.serverless.service.functions = {
                    func1: {
                        handler: 'func1',
                        events: [
                            { http: 'foo' },
                        ],
                    },
                }

                const compiledResources = {
                    CloudFunctions:
                        [{
                            Region: 'sh',
                            functionName: 'my-service-dev-func1',
                            handler: 'func1',
                            runtime: 'Nodejs6.10',
                            memorySize: 128,
                            timeout: 3,
                        }],
                    APIGatewayApis:
                        [{
                            Region: 'sh',
                            apiName: 'my-service-dev-func1',
                            serviceType: 'SCF',
                            serviceTimeout: 3,
                            authRequired: 'FALSE',
                            requestConfig: {
                                method: 'GET',
                                path: '/',
                            },
                            serviceScfFunctionName: 'my-service-dev-func1',
                            responseType: 'JSON',
                        }]
                }

                await qcloudPackage.compileFunctions()

                const { compiledConfigurationTemplate } = qcloudPackage.serverless.service.provider

                expect(compiledConfigurationTemplate.Resources)
                    .toEqual(compiledResources)
            })

            xit('should compile "event" events properly', () => {
                qcloudPackage.serverless.service.functions = {
                    func1: {
                        handler: 'func1',
                        events: [
                            {
                                event: {
                                    eventType: 'foo',
                                    path: 'some-path',
                                    resource: 'some-resource',
                                },
                            },
                        ],
                    },
                    func2: {
                        handler: 'func2',
                        events: [
                            {
                                event: {
                                    eventType: 'foo',
                                    resource: 'some-resource',
                                },
                            },
                        ],
                    },
                }

                const compiledResources = [
                    {
                        type: 'cloudfunctions.v1beta2.function',
                        name: 'my-service-dev-func1',
                        properties: {
                            location: 'us-central1',
                            function: 'func1',
                            availableMemoryMb: 256,
                            timeout: '60s',
                            sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
                            eventTrigger: {
                                eventType: 'foo',
                                path: 'some-path',
                                resource: 'some-resource',
                            },
                        },
                    },
                    {
                        type: 'cloudfunctions.v1beta2.function',
                        name: 'my-service-dev-func2',
                        properties: {
                            location: 'us-central1',
                            function: 'func2',
                            availableMemoryMb: 256,
                            timeout: '60s',
                            sourceArchiveUrl: 'gs://sls-my-service-dev-12345678/some-path/artifact.zip',
                            eventTrigger: {
                                eventType: 'foo',
                                resource: 'some-resource',
                            },
                        },
                    },
                ]

                return qcloudPackage.compileFunctions().then(() => {
                    expect(consoleLogStub.called).toEqual(true)
                    expect(qcloudPackage.serverless.service.provider.compiledConfigurationTemplate.resources)
                        .toEqual(compiledResources)
                })
            })
        })
    })

    describe('GenerateArtifactDirectoryName', () => {
        let serverless
        let qcloudPackage
        let statSyncStub

        beforeEach(() => {
            serverless = new Serverless()
            serverless.service.service = 'my-service'
            serverless.service.provider = {
                compiledConfigurationTemplate: {
                    Resources: {
                        DeploymentBucket: {},
                    },
                },
            }
            serverless.service.package = {
                artifact: 'my-code.zip',
            }
            serverless.setProvider('qcloud', new QcloudProvider(serverless))
            const options = {
                stage: 'dev',
                region: 'sh',
            }
            qcloudPackage = new QcloudPackage(serverless, options)
            statSyncStub = sinon.stub(fs, 'statSync').returns({ size: 99 } as any)
        })

        afterEach(() => {
            statSyncStub.restore()
        })

        it('should create a valid artifact directory name', async () => {
            await qcloudPackage.generateArtifactDirectoryName()

            const { DeploymentBucket } = serverless.service.provider.compiledConfigurationTemplate.Resources

            expect(DeploymentBucket.Key).toMatch(/^serverless\/my-service\/dev\/.+\/my-code\.zip$/)
            expect(DeploymentBucket.Body).toBe('my-code.zip')
            expect(DeploymentBucket.ContentLength).toBe(99)
        })
    })

    describe('MergeServiceResources', () => {
        let serverless
        let qcloudPackage

        beforeEach(() => {
            serverless = new Serverless()
            serverless.service.service = 'my-service'
            serverless.service.provider = {
                compiledConfigurationTemplate: {},
            }
            serverless.setProvider('qcloud', new QcloudProvider(serverless))
            const options = {
                stage: 'dev',
                region: 'sh',
            }
            qcloudPackage = new QcloudPackage(serverless, options)
        })

        it('should resolve if service resources are not defined', () => qcloudPackage
            .mergeServiceResources().then(() => {
                expect(serverless.service.provider
                    .compiledConfigurationTemplate).toEqual({})
            }))

        it('should resolve if service resources is empty', () => {
            serverless.service.resources = {}

            return qcloudPackage.mergeServiceResources().then(() => {
                expect(serverless.service.provider
                    .compiledConfigurationTemplate).toEqual({})
            })
        })

        it('should merge all the resources if provided', () => {
            serverless.service.provider.compiledConfigurationTemplate = {
                resources: [
                    {
                        name: 'resource1',
                        type: 'type1',
                        properties: {
                            property1: 'value1',
                        },
                    },
                ],
            }

            serverless.service.resources = {
                resources: [
                    {
                        name: 'resource2',
                        type: 'type2',
                        properties: {
                            property1: 'value1',
                        },
                    },
                ],
                imports: [
                    {
                        path: 'path/to/template.jinja',
                        name: 'my-template',
                    },
                ],
            }

            const expectedResult = {
                resources: [
                    {
                        name: 'resource1',
                        type: 'type1',
                        properties: {
                            property1: 'value1',
                        },
                    },
                    {
                        name: 'resource2',
                        type: 'type2',
                        properties: {
                            property1: 'value1',
                        },
                    },
                ],
                imports: [
                    {
                        path: 'path/to/template.jinja',
                        name: 'my-template',
                    },
                ],
            }

            return qcloudPackage.mergeServiceResources().then(() => {
                expect(serverless.service.provider.compiledConfigurationTemplate)
                    .toEqual(expectedResult)
            })
        })
    })
})
