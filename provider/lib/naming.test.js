'use strict'

const naming = require('./naming')

describe('naming', () => {
    it('should contain the provider name', () => {
        expect(naming.providerName).toEqual('qcloud')
    })
})
