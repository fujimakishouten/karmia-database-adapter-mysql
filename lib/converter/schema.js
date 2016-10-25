/* vim: set expandtab tabstop=4 shiftwidth=4 softtabstop=4: */
/* eslint-env es6, mocha, node */
/* eslint-extends: eslint:recommended */
'use strict';



// Variables
const sequelize = require('sequelize'),
    map = {
        array: sequelize.TEXT,
        boolean: sequelize.BOOLEAN,
        integer: sequelize.INTEGER,
        number: sequelize.DOUBLE,
        object: sequelize.TEXT,
        string: sequelize.STRING
    },
    serialize = ['array', 'object'],
    numbers = ['number', 'integer', sequelize.INTEGER, sequelize.BIGINT];


/**
 * KarmiaDatabaseAdapterMySQLConverterSchema
 *
 * @class
 */
class KarmiaDatabaseAdapterMySQLConverterSchema {
    /**
     * Convert schemas
     *
     * @param   {Object} schemas
     * @returns {Object}
     */
    convert(schemas) {
        const self = this;

        return (function convert(schemas) {
            if (Array.isArray(schemas)) {
                return schemas.map(convert);
            }

            if (Object.getPrototypeOf(schemas) === Object.prototype) {
                return Object.keys(schemas).reduce(function (collection, key) {
                    if ('properties' === key) {
                        collection.properties = self.properties(schemas);
                        collection.key = self.key(schemas);
                    }

                    if ('indexes' === key) {
                        collection.indexes = self.indexes(schemas);
                    }

                    collection[key] = convert(collection[key] || schemas[key]);

                    return collection;
                }, {});
            }

            return schemas;
        })(schemas);
    }

    /**
     * Convert properties
     *
     * @param   {Object} schemas
     * @returns {Object}
     */
    properties(schemas) {
        const keys = schemas.key || [],
            required = schemas.required || [],
            result = Object.keys(schemas.properties).reduce(function (collection, key) {
                const property = Object.assign({}, schemas.properties[key]);
                property.allowNull = (0 > required.indexOf(key));
                property.serialize = (-1 < serialize.indexOf(property.type));

                property.type = map[property.type] || property.type;
                if (property.type instanceof sequelize.STRING) {
                    property.type = (property.maxLength) ? sequelize.STRING(property.maxLength) : property.type;
                    property.type = (property.binary) ? sequelize.STRING.BINARY : property.type;
                }
                if (property.type instanceof sequelize.TEXT) {
                    property.type = (property.tiny) ? sequelize.TEXT('tiny') : property.type;
                }

                collection[key] = property;

                return collection;
            }, {});

        (Array.isArray(keys) ? keys : [keys]).forEach(function (key) {
            result[key].primaryKey = true;
            if (-1 < numbers.indexOf(result[key].type)) {
                result[key].autoIncrement = true;
            }
        });

        return result;
    }

    /**
     * Convert key
     *
     * @param   {Object} schemas
     * @returns {Object}
     */
    key(schemas) {
        const keys = schemas.key || [];
        Object.keys(schemas.properties).forEach(function (key) {
            if (schemas.properties[key].primaryKey && 0 > keys.indexOf(key)) {
                keys.push(key);
            }
        });

        return keys;
    }

    /**
     * Convert indexes
     *
     * @param   {Object} schemas
     * @returns {Array}
     */
    indexes(schemas) {
        return schemas.indexes.reduce(function (collection, index) {

            if (Array.isArray(index)) {
                const fields = (Object.getPrototypeOf(index[0]) === Object.prototype) ? Object.keys(index[0]) : index,
                    options = (index[1] && Object.getPrototypeOf(index[1]) === Object.prototype) ? index[1] : {};
                collection.push(Object.assign({fields: fields}, options));

                return collection;
            }

            if (Object.getPrototypeOf(index) === Object.prototype) {
                let fields = (index.fields) ? index.fields : Object.keys(index);
                fields = (Object.getPrototypeOf(fields) === Object.prototype) ? Object.keys(fields) : fields;

                let options = {};
                if (index.fields) {
                    options = Object.keys(index).reduce(function (result, key) {
                        if ('fields' === key) {
                            return result;
                        }
                        result[key] = index[key];

                        return result;
                    }, {});
                }

                if (options.config && 1 === Object.keys(options).length) {
                    options = options.config;
                }
                collection.push(Object.assign({fields: fields}, options));

                return collection;
            }

            collection.push({fields: [index]});

            return collection;
        }, []);
    }
}


// Export module
module.exports = function () {
    return new KarmiaDatabaseAdapterMySQLConverterSchema();
};



/*
 * Local variables:
 * tab-width: 4
 * c-basic-offset: 4
 * c-hanging-comment-ender-p: nil
 * End:
 */
