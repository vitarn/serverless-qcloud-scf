# [PRIVATE] Qcloud API Gateway SDK

`npm i qcloudapi-sdk`

```js
const QcloudAPI = require('qcloudapi-sdk')
const apigateway = new QcloudAPI({
    serviceType: 'apigateway',
    SecretId: 'xxx',
    SecretKey: 'xxx',
})

apigateway.request({
    Action: '',
    Region: 'gz',
    ...
}, (err, res) => {})
```

## Common Params

| name | value | desc |
| ---  | ---   | ---  |
| **Action** | `CreateService` |
| **Region** | `bj | sh | gz` |

## CreateService

| name | value | desc |
| ---  | ---   | ---  |
| **protocol** | `http | https | http&https` |
| serviceName |  | Generate a random string if not set |
| serviceDesc |
