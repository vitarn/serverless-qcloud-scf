'use strict';

const getCOSRegion = require('./getCOSRegion');

describe('getCOSRegion', () => {
    it('should get COS Region from region short name', () => {
        expect(getCOSRegion('gz')).toEqual('ap-guangzhou');
    });
});
