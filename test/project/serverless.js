module.exports = {
    service: 'demo',

    provider: {
        name: 'qcloud',
        region: 'bj',
        runtime: 'nodejs6.10',
        memorySize: 128,
        timeout: 3,
        // credentials: '~/.qcloudcli/credentials',
        // deploymentBucket: {
        //     name: 'serverless-deployment-${self:provider.region}',
        // },
        // apiGateway: {
        //     name: '${self:service}',
        //     description: 'My demo api gateway service',
        //     protocol: 'http&https',
        // },
    },

    plugins: [
        'serverless-qcloud-scf',
    ],

    package: {
        include: [
            '*.js',
        ],
        exclude: [
            '*.ts',
            'node_modules/.yarn-integrity',
            'node_modules/**/CHANGELOG.md',
            'node_modules/**/LICENSE',
            'node_modules/**/README.md',
            'serverless.js',
            'yarn.lock',
        ],
    },

    functions: {
        hello: {
            handler: 'handler.hello',
            description: 'hello function',
            environment: {
                NODE_ENV: 'production',
            },
            events: [{
                http: {
                    method: 'get',
                    path: 'hello',
                    description: 'hello api',
                },
            }],
        },
        bye: {
            handler: 'handler.bye',
            events: [{
                http: {
                    method: 'delete',
                    path: 'bye',
                    private: true,
                },
            }],
        },
    },
}
