/* vim: set expandtab tabstop=4 shiftwidth=4 softtabstop=4: */
/* eslint-env es6, mocha, node */
/* eslint-extends: eslint:recommended */
'use strict';



// Variables
const schema = require('../schema/sequence');


/**
 * KarmiaDatabaseAdapterMySQLSequence
 *
 * @class
 */
class KarmiaDatabaseAdapterMySQLSequence {
    /**
     * Constructor
     *
     * @param {Object} connection
     * @param {string} key
     * @param {Object} options
     * @constructs KarmiaDatabaseAdapterMySQLSequence
     */
    constructor(connection, key, options) {
        const self = this;
        self.connection = connection;
        self.key = key;
        self.config = options || {};

        self.name = self.config.name || 'sequence';
    }

    /**
     * Sync schema
     *
     * @param callback
     * @returns {*}
     */
    model(callback) {
        const self = this;
        if (self.table) {
            return (callback) ? callback(null, self.table) : Promise.resolve(self.table);
        }

        try {
            self.table = self.connection.model(self.name);
        } catch (e) {
            if (-1 < e.message.indexOf(' has not been defined')) {
                self.table = self.connection.define(self.name, schema);

                return self.connection.sync().then(function () {
                    return (callback) ? callback(null, self.table) : Promise.resolve(self.table);
                }).catch(function (error) {
                    return (callback) ? callback(error) : Promise.reject(error);
                });
            } else {
                return (callback) ? callback(e) : Promise.reject(e);
            }
        }

        return (callback) ? callback(null, self.table) : Promise.resolve(self.table);
    }

    /**
     * Get sequence value
     *
     * @param {Object} options
     * @param {Function} callback
     */
    get(options, callback) {
        if (options instanceof Function) {
            callback = options;
            options = {};
        }

        const self = this,
            parameters = Object.assign({}, options || {});

        return self.model().then(function () {
            return self.connection.transaction(parameters).then(function (transaction) {
                parameters.transaction = transaction;

                const conditions = Object.assign({
                    where: {key: self.key},
                    transaction: parameters.transaction,
                    lock: transaction.LOCK.UPDATE
                }, parameters.transaction || parameters);

                return self.table.find(conditions);
            });
        }).then(function (result) {
            const value = (result) ? result.value : 0,
                values = {
                    key: self.key,
                    value: value + 1
                };

            return self.table.upsert(values, parameters).then(function () {
                return parameters.transaction.commit();
            }).then(function () {
                return Promise.resolve(values.value);
            }).catch(function (error) {
                return parameters.transaction.rollback().then(function () {
                    return Promise.reject(error);
                });
            });
        }).then(function (result) {
            return (callback) ? callback(null, result) : Promise.resolve(result);
        }).catch(function (error) {
            return (callback) ? callback(error) : Promise.reject(error);
        });
    }
}


// Export module
module.exports = function (connection, key, options) {
    return new KarmiaDatabaseAdapterMySQLSequence(connection, key, options || {});
};



/*
 * Local variables:
 * tab-width: 4
 * c-basic-offset: 4
 * c-hanging-comment-ender-p: nil
 * End:
 */
