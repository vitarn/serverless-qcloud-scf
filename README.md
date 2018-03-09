English | [简体中文](./README.zh-CN.md)

# Serverless QCloud SCF(Serverless Cloud Function) Plugin

[![Serverless][ico-serverless]][link-serverless]
[![License][ico-license]][link-license]
[![NPM][ico-npm]][link-npm]
[![Build Status][ico-build]][link-build]
[![Coverage Status][ico-codecov]][link-codecov]
[![Conventional Commits][ico-commit]][link-commit]

This plugin enables support for [QCloud SCF][link-qcloud-scf] within the [Serverless Framework][link-gh-serverless].

## Getting started

### Pre-requisites

* Node.js `>= 6` for using the plugin.
  * Note that at the moment, Qcloud Serverless Cloud Function only supports v6.10. If you use a higher version of nodejs. Don't forget transform your code down to es5.
* Serverless CLI v1.20.0+. You can get it by running `npm i -g serverless`.
* A Qcloud account.

### Example

The structure of the project should look something like this:

```
├── index.js
├── node_modules
├── package.json
└── serverless.yml
```

`serverless.yml`:

```yaml
service: hello-world

provider:
  name: qcloud
  runtime: nodejs6.10
  credentials: ~/.qcloudcli/credentials # path must be absolute

plugins:
  - serverless-qcloud-scf

package:
  include:
    - index.js
  exclude:
    - package-lock.json
    - .gitignore
    - .git/**

functions:
  hello:
    handler: index.hello
    events:
      - http:
          path: /hello
          method: get
```

`package.json`:

```json
{
  "name": "serverless-qcloud-hello-world",
  "version": "0.1.0",
  "description": "Hello World example for qcloud provider with Serverless Framework.",
  "main": "index.js",
  "license": "MIT",
  "devDependencies": {
    "serverless-qcloud-scf": "*"
  }
}
```

`index.js`:

```javascript
'use strict'

exports.hello = (event, context, callback) => {
  callback(null, 'Hello!')
}
```

**Credentials**

Note that `~/.qcloudcli/credentials` is where the [qcloudcli][link-qcloud-cli] puts the crendentials after running `qcloudcli configure`. You don't have to use qcloudcli though, you can just create a similar file with your own access keys and make sure pointing the value of the `credentials` field in `serverless.yml` to it.

In addition to `qcloud_secretkey` and `qcloud_secretid`, please configure `qcloud_appid` (a numeric number for identifying your account, available in Qcloud Console) as well. This credential file should look something like this:

```ini
[default]
qcloud_secretkey = ****************Ewdm
qcloud_secretid = ****************ugEY
qcloud_appid = 1250000000
```

**Put credentials in ENV**

If you not prefer `qcloudcli`. You can write credentials in ENV. `serverless-qcloud-scf` will read them.

`QCLOUD_SECRETID=xxx QCLOUD_SECRETKEY=xxx QCLOUD_APPID=1250000000 serverless package`

Consider use [dotenv][link-gh-dotenv] or [direnv][link-gh-direnv].

### Workflow

* Deploy your service to Qcloud:

  ```console
  serverless deploy
  ```

  If your service contains HTTP endpoints, you will see the URLs for invoking your functions after a successful deployment.

* When you no longer needs your service, you can remove the service, functions, along with deployed endpoints and triggers using:

  ```console
  serverless remove
  ```

  Note: Some resources cannot remove, since it's not empty. The reason is your projects share a common service name. This issue different project deploy into same COS Bucket / API Gateway.

## LIMIT

### SCF

Function name is unique in a region.

The functions cannot more than 20, see [scf document][link-qcloud-scf-limit]

### COS

Bucket name is unique in an account.

Plugin will try overwrite ACL to `public-read` and write files into it if deploy target bucket is exists.

When create function in bj region, Qcloud will read code from COS `ap-beijing-1` region.

### API Gateway

Service ID is unique. Service name and API name is not unique.

Plugin will search service by region and name. Create it if not exists. Overwrite exists apis if service exists. But cannot handle multi service with same names.

Inside service, API "method+path" is unique.

## Develop

```
# clone this repo
git clone git@github.com:vitarn/serverless-qcloud-scf.git

# link this module to global node_modules
cd serverless-qcloud-scf
npm install
npm link

# try it out by packaging the test project
cd test/project
npm install
npm link serverless-qcloud-scf
serverless package
```

## TODO

* [x] `serverless package`
* [x] `serverless deploy`
* [x] `serverless deploy --function`
* [x] `serverless remove`
* [ ] `serverless invoke`
* [x] `serverless info`
* [ ] `serverless rollback`
* [ ] function: event: cos
* [ ] function: event: cmq
* [ ] function: event: http: usagePlan
* [ ] function: event: http: key
* [ ] function: event: http: custom domain
* [ ] function: event: http: switch release

## License

MIT

[ico-serverless]: http://public.serverless.com/badges/v3.svg
[ico-license]: https://img.shields.io/github/license/vitarn/serverless-qcloud-scf.svg
[ico-npm]: https://img.shields.io/npm/v/serverless-qcloud-scf.svg
[ico-build]: https://travis-ci.org/vitarn/serverless-qcloud-scf.svg?branch=master
[ico-codecov]: https://codecov.io/gh/vitarn/serverless-qcloud-scf/branch/master/graph/badge.svg
[ico-commit]: https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg

[link-serverless]: http://www.serverless.com/
[link-license]: ./blob/master/LICENSE
[link-npm]: https://www.npmjs.com/package/serverless-qcloud-scf
[link-build]: https://travis-ci.org/vitarn/serverless-qcloud-scf
[link-codecov]: https://codecov.io/gh/vitarn/serverless-qcloud-scf
[link-commit]: https://conventionalcommits.org

[link-gh-serverless]: https://github.com/serverless/serverless
[link-gh-dotenv]: https://github.com/motdotla/dotenv
[link-gh-direnv]: https://github.com/direnv/direnv

[link-qcloud-scf]: https://cloud.tencent.com/product/scf
[link-qcloud-cli]: https://cloud.tencent.com/product/cli
[link-qcloud-scf-limit]: https://cloud.tencent.com/document/product/583/11637
