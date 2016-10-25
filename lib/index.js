/* vim: set expandtab tabstop=4 shiftwidth=4 softtabstop=4: */
/* eslint-env es6, mocha, node */
/* eslint-extends: eslint:recommended */
'use strict';



// Variables
const sequelize = require('sequelize'),
    converter = require('./converter'),
    sequence = require('./sequence'),
    suite = require('./suite'),
    table = require('./table');


/**
 * KarmiaDatabaseAdapterMySQL
 *
 * @class
 */
class KarmiaDatabaseAdapterMySQL {
    /**
     * Constructor
     *
     * @param {Object} options
     * @constructs KarmiaDatabaseAdapterMySQL
     */
    constructor(options) {
        const self = this;
        self.config = options || {};

        self.converters = converter(self.config.converter || {});

        self.host = self.config.host || 'localhost';
        self.port = self.config.port || 3306;
        self.database = self.config.database || self.config.keyspace;
        self.options = self.config.options || {};
        self.user = self.config.user || self.config.username;
        self.password = self.config.password || self.config.pass;
    }

    /**
     * Get connection
     *
     * @returns {Object}
     */
    getConnection() {
        const self = this;

        return self.connection;
    }

    /**
     * Connect to database
     *
     * @param   {Function} callback
     */
    connect(callback) {
        const self = this,
            options = Object.assign({}, self.config.options);
        options.host = self.host;
        options.port = self.port;
        self.connection = new sequelize(self.database, self.user, self.password, options);

        return (callback) ? callback() : Promise.resolve();
    }

    /**
     * Disconnect from database
     *
     * @param {Function} callback
     */
    disconnect(callback) {
        const self = this;
        if (self.connection) {
            self.connection.close();
        }

        return (callback) ? callback() : Promise.resolve();
    }

    /**
     * Define schemas
     *
     * @param   {string} name
     * @param   {Object} schema
     * @returns {Object}
     */
    define(name, schema) {
        const self = this;
        self.schemas = self.schemas || {};
        self.schemas[name] = schema;

        return self;
    }

    /**
     * Configure
     *
     * @param callback
     */
    sync(callback) {
        const self = this;
        self.tables = self.tables || {};

        return (self.connection ? Promise.resolve() : self.connect()).then(function () {
            Object.keys(self.schemas).forEach(function (key) {
                const definition = self.converters.schema.convert(self.schemas[key]),
                    validation = self.converters.validator.convert(self.schemas[key]),
                    options = definition.options || {};
                options.timestamps = ('timestamps' in options) ? options.timestamps : true;
                if (options.timestamps) {
                    options.createdAt = ('createdAt' in options) ? options.createdAt : 'created_at';
                    options.updatedAt = ('updatedAt' in options) ? options.updatedAt : 'updated_at';
                }
                options.indexes = options.indexes || [];
                options.indexes = Array.isArray(options.indexes) ? options.indexes : [options.indexes];
                options.indexes = options.indexes.concat(definition.indexes || []);

                const model = self.connection.define(key, definition.properties, options);
                self.tables[key] = table(self.connection, model, validation);
                self.tables[key].serialize = Object.keys(definition.properties).reduce(function (collection, key) {
                    if (definition.properties[key].serialize) {
                        collection.push(key);
                    }

                    return collection;
                }, []);
            });

            if (callback) {
                return self.connection.sync().then(function (result) {
                    callback(null, result);
                }).catch(callback);
            }

            return self.connection.sync();
        }).catch(function (error) {
            return (callback) ? callback(error) : Promise.reject(error);
        });
    }

    /**
     * Get table
     *
     * @param   {string} name
     * @returns {Object}
     */
    table(name) {
        const self = this;
        self.tables = self.tables || {};

        return self.tables[name];
    }

    /**
     * Get sequence
     *
     * @param   {string} key
     * @param   {Object} options
     * @returns {Object}
     */
    sequence(key, options) {
        const self = this;
        self.sequence = self.sequence || {};
        self.sequence[key] = self.sequence[key] || sequence(self.connection, key, options);

        return self.sequence[key];
    }

    /**
     * Get table suite
     *
     * @param   {string} name
     * @param   {Array} tables
     * @param   {number|string} id
     * @returns {Object}
     */
    suite(name, tables, id) {
        const self = this;

        return suite(self, name, tables, id);
    }
}


// Export module
module.exports = function (options) {
    return new KarmiaDatabaseAdapterMySQL(options || {});
};



/*
 * Local variables:
 * tab-width: 4
 * c-basic-offset: 4
 * c-hanging-comment-ender-p: nil
 * End:
 */

