/* vim: set expandtab tabstop=4 shiftwidth=4 softtabstop=4: */
/* eslint-env es6, mocha, node */
/* eslint-extends: eslint:recommended */
'use strict';



// Variables
const sequelize = require('sequelize');


// Export module
module.exports = {
    key: {
        type: sequelize.STRING(64),
        primaryKey: true
    },
    value: {
        type: sequelize.BIGINT,
        default: 0
    }
};



/*
 * Local variables:
 * tab-width: 4
 * c-basic-offset: 4
 * c-hanging-comment-ender-p: nil
 * End:
 */

