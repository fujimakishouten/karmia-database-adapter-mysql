/* vim: set expandtab tabstop=4 shiftwidth=4 softtabstop=4: */
/* eslint-env es6, mocha, node */
/* eslint-extends: eslint:recommended */
'use strict';



// Variables
const jsonschema = require('jsonschema');


/**
 * KarmiaDatabaseAdapterMySQLTable
 *
 * @class
 */
class KarmiaDatabaseAdapterMySQLTable {
    /**
     * Constructor
     *
     * @param {Object} connection
     * @param {Object} model
     * @param {Object} validation
     * @constructs KarmiaDatabaseAdapterMySQLTable
     */
    constructor(connection, model, validation) {
        const self = this;
        self.connection = connection;
        self.model = model;
        self.validation = validation;

        self.key = Array.isArray(validation.key) ? validation.key : [validation.key];
        self.fields = Object.keys(validation.properties);
        self.ttl = validation.ttl || 0;
    }

    /**
     * Validate data
     *
     * @param {Object} data
     * @param {Function} callback
     */
    validate(data, callback) {
        const self = this,
            result = jsonschema.validate(data, self.validation);
        if (result.errors.length) {
            return (callback) ? callback(result.errors) : Promise.reject(result.errors);
        }

        return (callback) ? callback(null, data) : Promise.resolve(data);
    }

    /**
     * Count items
     *
     * @param   {Object} conditions
     * @param   {Function} callback
     */
    count(conditions, callback) {
        if (conditions instanceof Function) {
            callback = conditions;
            conditions = {};
        }

        const self = this;

        return self.model.count(conditions).then(function (result) {
            return (callback) ? callback(null, result) : Promise.resolve(result);
        }).catch(function (error) {
            return (callback) ? callback(error) : Promise.reject(error);
        });
    }

    /**
     * Find item
     *
     * @param   {Object} conditions
     * @param   {Object} projection
     * @param   {Object} options
     * @param   {Function} callback
     */
    get(conditions, projection, options, callback) {
        if (conditions instanceof Function) {
            callback = conditions;
            conditions = {};
            projection = {};
            options = {};
        }

        if (projection instanceof Function) {
            callback = projection;
            projection = {};
            options = {};
        }

        if (options instanceof Function) {
            callback = options;
            options = {};
        }

        conditions = conditions || {};
        projection = projection || {};
        options = options || {};

        const self = this,
            parameters = Object.assign(options || {}),
            attributes = self.getAttributes(projection);
        parameters.where = Object.assign(parameters.where || {}, conditions || {});
        if (attributes) {
            parameters.attributes = attributes;
        }
        if (!Object.keys(parameters.where).length) {
            return (callback) ? callback(null, null) : Promise.resolve(null);
        }

        return self.model.findOne(parameters).then(function (result) {
            if (result) {
                self.serialize.forEach(function (key) {
                    result[key] = (result[key]) ? JSON.parse(result[key]) : result[key];
                });
            }

            return (callback) ? callback(null, result) : Promise.resolve(result);
        }).catch(function (error) {
            return (callback) ? callback(null, error) : Promise.reject(error);
        });
    }

    /**
     * Find items
     *
     * @param   {Object} conditions
     * @param   {Array|Object} projection
     * @param   {Object} options
     * @param   {Function} callback
     */
    find(conditions, projection, options, callback) {
        if (conditions instanceof Function) {
            callback = conditions;
            conditions = {};
            projection = {};
            options = {};
        }

        if (projection instanceof Function) {
            callback = projection;
            projection = {};
            options = {};
        }

        if (options instanceof Function) {
            callback = options;
            options = {};
        }

        conditions = conditions || {};
        projection = projection || {};
        options = options || {};

        const self = this,
            parameters = Object.assign(options || {}),
            attributes = self.getAttributes(projection);
        parameters.where = Object.assign(parameters.where || {}, conditions || {});
        if (attributes) {
            parameters.attributes = attributes;
        }

        return self.model.findAll(parameters).then(function (result) {
            result = result.map(function (instance) {
                self.serialize.forEach(function (key) {
                    instance[key] = (instance[key]) ? JSON.parse(instance[key]) : instance[key];
                });

                return instance;
            });

            return (callback) ? callback(null, result) : Promise.resolve(result);
        }).catch(function (error) {
            return (callback) ? callback(null, error) : Promise.reject(error);
        });
    }

    /**
     * Save item
     *
     * @param {Object} data
     * @param {Object} options
     * @param {Function} callback
     */
    set(data, options, callback) {
        options = options || {};
        if (options instanceof Function) {
            callback = options;
            options = {};
        }

        const self = this,
            keys = self.key.reduce(function (collection, key) {
                collection[key] = data[key];

                return collection;
            }, {}),
            values = self.fields.reduce(function (collection, key) {
                if (key in data) {
                    collection[key] = data[key];
                }

                return collection;
            }, {}),
            conditions = Object.assign({}, options || {}, {where: keys});

        return self.model.findOne(Object.assign(conditions)).then(function (result) {
            const model = (result) ? Object.assign(result, values) : self.model.build(data);
            self.serialize.forEach(function (key) {
                model[key] = (model[key] instanceof Object) ? JSON.stringify(model[key]) : model[key];
            });

            return model.save(options);
        }).then(function (result) {
            return (callback) ? callback(null, result) : Promise.resolve(result);
        }).catch(function (error) {
            return (callback) ? callback(error) : Promise.reject(error);
        });
    }

    /**
     * Remove items
     *
     * @param   {Object} conditions
     * @param   {Object} options
     * @param   {Function} callback
     */
    remove(conditions, options, callback) {
        if (conditions instanceof Function) {
            callback = conditions;
            conditions = {};
            options = {};
        }

        if (options instanceof Function) {
            callback = options;
            options = {};
        }

        const self = this,
            parameters = Object.assign(options || {});
        parameters.where = Object.assign(parameters.where || {}, conditions);

        if (!Object.keys(parameters.where).length) {
            return (callback) ? callback() : Promise.resolve();
        }

        return self.model.destroy(parameters).then(function (result) {
            return (callback) ? callback(null, result) : Promise.resolve(result);
        }).catch(function (error) {
            return (callback) ? callback(null, error) : Promise.reject(error);
        });
    }

    /**
     * Convert projection to attributes
     *
     * @param {Object} projection
     * @returns {Array|Object}
     */
    getAttributes(projection) {
        const parameters = projection || {};
        if (Object.getPrototypeOf(parameters) === Object.prototype) {
            if ('include' in parameters || 'exclude' in parameters) {
                return parameters;
            }

            return Object.keys(parameters).reduce(function (collection, key) {
                if (parameters[key]) {
                    collection = collection || [];
                    collection.push(key);
                }

                return collection;
            }, null);
        }

        return Array.isArray(parameters) ? parameters : [parameters];
    }
}


// Export module
module.exports = function (connection, model, schema) {
    return new KarmiaDatabaseAdapterMySQLTable(connection, model, schema);
};



/*
 * Local variables:
 * tab-width: 4
 * c-basic-offset: 4
 * c-hanging-comment-ender-p: nil
 * End:
 */

