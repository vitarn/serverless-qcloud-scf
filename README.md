# Serverless QCloud SCF(Serverless Cloud Function) Plugin

This plugin enables support for [QCloud SCF](https://cloud.tencent.com/product/scf) within the [Serverless Framework](https://github.com/serverless/serverless).

## Getting started

### Pre-requisites

* Node.js v8.x for using the plugin.
  * Note that at the moment, Qcloud Serverless Cloud Function only supports v6.10. But for now we still need to use a higher version of runtime to use the CLI.
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
    "serverless-qcloud-scf": "^0.0.1"
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

Note that `~/.qcloudcli/credentials` is where the [qcloudcli](https://cloud.tencent.com/product/cli) puts the crendentials after running `qcloudcli configure`. You don't have to use qcloudcli though, you can just create a similar file with your own access keys and make sure pointing the value of the `credentials` field in `serverless.yml` to it.

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

Consider use [dotenv](https://github.com/motdotla/dotenv) or [direnv](https://github.com/direnv/direnv).

### Workflow

* Deploy your service to Qcloud:

  ```console
  serverless deploy
  ```

  If your service contains HTTP endpoints, you will see the URLs for invoking your functions after a successful deployment.

* When you no longer needs your service, you can remove the service, functions, along with deployed endpoints and triggers using:

  ```
  serverless remove
  ```

  Note: by default RAM roles and policies created during the deployment are not removed. You can use `serverless remove --remove-roles` if you do want to remove them.

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

* [ ] `serverless invoke`
* [ ] `serverless info`
* [ ] `serverless deploy function`
* [ ] `serverless rollback`
* [ ] function: event: cos
* [ ] function: event: cmq
* [ ] function: event: http: usagePlan
* [ ] function: event: http: key
* [ ] function: event: http: custom domain
* [ ] function: event: http: switch release

## License

MIT
