[English](./README.md) | 简体中文

# Serverless QCloud SCF(Serverless Cloud Function) Plugin

本插件提供 [Serverless Framework](https://github.com/serverless/serverless) 对 [QCloud SCF](https://cloud.tencent.com/product/scf) 的支持.

## 安装使用

### 需求

* Node.js 版本不低于 v8.x.
  * 目前, Qcloud 云函数只支持 Node.js v6.10. 但你仍然需要 Node8 以上版本运行 Serverless CLI.
* Serverless CLI v1.20.0+. 通过 `npm i -g serverless` 安装.
* Qcloud 帐号.

### 例子

项目文件结构类似这样:

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
  credentials: ~/.qcloudcli/credentials # 必须提供绝对路径

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

**凭证**

注意 `~/.qcloudcli/credentials` 是 [qcloudcli](https://cloud.tencent.com/product/cli) 在运行 `qcloudcli configure` 后生成的凭证. 你不必使用 qcloudcli, 也可以选择手动创建这个文件, 填入你的 secret keys, 记得在 `serverless.yml` 文件里指向 credentials 文件.

除了 `qcloud_secretkey` and `qcloud_secretid` 以外, 请配置 `qcloud_appid` (在 Qcloud 控制台中可以找到你的帐号ID, 以125开头的数字). 完整的凭证文件类似这样:

```ini
[default]
qcloud_secretkey = ****************Ewdm
qcloud_secretid = ****************ugEY
qcloud_appid = 1250000000
```

**环境变量中的凭证**

如果你不喜欢 `qcloudcli` 这种方式. 你也可以把凭证放到环境变量里. `serverless-qcloud-scf` 会尝试从环境变量中读取.

`QCLOUD_SECRETID=xxx QCLOUD_SECRETKEY=xxx QCLOUD_APPID=1250000000 serverless package`

建议尝试 [dotenv](https://github.com/motdotla/dotenv) 或 [direnv](https://github.com/direnv/direnv).

### 工作流

* 部署服务到 Qcloud:

  ```console
  serverless deploy
  ```

  如果你的服务包含 HTTP 终端点, 部署成功后会显示调用云函数所需的网址.

* 当你不再需要之前部署的服务后可以选择移除它们:

  ```console
  serverless remove
  ```

  **注意**: 部分资源可能无法移除, 例如非空的 COS Bucket, 非空的 API 网关, 造成这种情况的原因有很多, 例如部署成功后修改了项目配置 `serverless.yml`, 例如你有多个项目共享同一个服务名称, 则这些项目会共享 COS Bucket 和 API 网关.

## 限制

### 云函数(SCF)

同地域下云函数名称唯一.

每个地域下的最大函数数量不能超过20个, 详见[产品文档](https://cloud.tencent.com/document/product/583/11637)

### 对象存储(COS)

同帐号下对象存储名称唯一.

如果部署所用的 Bucket 已经存在, 插件会尝试将 ACL 设为 `public-read` 并向其中写入内容.

创建北京(bj)区云函数时, 代码只能从对象存储 `ap-beijing-1` 区读取.

### API 网关

服务ID唯一. 服务名允许重名. API允许重名.

插件根据区域和服务名搜寻目标服务, 如果不存在则创建, 如果存在会覆盖其中已有的 API, 插件无法处理两个以上的同名服务.

服务内部的 API 按路径和方法决定唯一性.

## 开发

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
