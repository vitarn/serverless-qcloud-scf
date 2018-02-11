'use strict'

exports.hello = function (event, context, callback) {
    callback(null, 'Qcloud Serverless (nodejs@6.10) v0.1.0! Your function executed successfully!')
}

exports.bye = function (event, context, callback) {
    callback(null, 'bye bye')
}
