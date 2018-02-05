'use strict';

const _ = require('lodash');
const BbPromise = require('bluebird');

const COSRegionMap = {
    bj: 'ap-beijing',
    sh: 'ap-shanghai',
    gz: 'ap-guangzhou',
}

module.exports = (region) => {
    const cosRegion = COSRegionMap[region];

    if (!cosRegion) throw new Error(`Qcloud scf not supported in region ${region}`);

    return cosRegion;
};
