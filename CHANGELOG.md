# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="0.0.4"></a>
## [0.0.4](https://github.com/vitarn/serverless-qcloud-scf/compare/v0.0.3...v0.0.4) (2018-03-09)


### Features

* support cos trigger event ([#9](https://github.com/vitarn/serverless-qcloud-scf/issues/9)) ([8e9f2da](https://github.com/vitarn/serverless-qcloud-scf/commit/8e9f2da))




v0.0.3 / 2018-02-28
===================

## New:
  1. Support `sls deploy -f xxx`
  2. Support `sls info`

  * Fix test
  * Bump version
  * Define travis stages
  * Fix info command function default method GET
  * Omit code when create function
  * Merge deployment configuration template into one file
  * Add deploy function command
  * Add ServerlessQcloudConfig type definition
  * Fix entry
  * Remove node4 from travis
  * Remove lint
  * Mkdir commands
  * Fully switch to typescript
  * Add typescript config
  * Add badges
  * Active codecov
  * Update qcloud-apigateway
  * Fix provider get credentials
  * Fix and skip info test
  * Add travis
  * Add base support for info command
  * Move shared to lib
  * Add readme zh
  * Add changelog

v0.0.2 / 2018-02-11
===================

This is the first preview release.

Supported command:
  1. `serverless package`
  2. `serverless deploy`
  3. `serverless remove`

Supported event:
  1. `http`

Commit history:
  * Update readme
  * Add test project
  * Read appid from credentials
  * Limit node >=8
  * Add command remove
  * Add provider region and test
  * Provider method to getter
  * Fix another test
  * Fix Resources APIGateway
  * Finish package test
  * Fix package tests
  * Upgrade dependencies
  * Fix package cleanupServerlessDir test
  * Fix provider and shared test
  * Working on test
  * First deployed version
  * Setup API Gateway
  * Add qcloud-apigateway
  * Working on api gateway
  * working on create function
  * COS put object
  * Add command package
  * First commit
