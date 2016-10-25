/* vim: set expandtab tabstop=4 shiftwidth=4 softtabstop=4: */
/* eslint-env es6, mocha, node */
/* eslint-extends: eslint:recommended */
'use strict';



// Variables
const sequelize = require('sequelize'),
    map = {};
map[sequelize.STRING] = 'string';
map[sequelize.STRING.BINARY] = 'string';
map[sequelize.TEXT] = 'string';
map[sequelize.INTEGER] = 'number';
map[sequelize.BIGINT] = 'number';
map[sequelize.FLOAT] = 'number';
map[sequelize.DOUBLE] = 'number';
map[sequelize.DECIMAL] = 'number';
map[sequelize.DATE] = 'string';
map[sequelize.DATEONLY] = 'string';
map[sequelize.BOOLEAN] = 'boolean';
map[sequelize.ENUM] = 'string';
map[sequelize.UUID] = 'string';
map[sequelize.GEOMETRY] = 'string';


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
                        collection.required = self.required(schemas);
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
        return Object.keys(schemas.properties).reduce(function (collection, key) {
            const property = Object.assign({}, schemas.properties[key]);
            property.type = map[property.type] || property.type;
            if (property.type instanceof sequelize.ABSTRACT) {
                const type = property.type || {},
                    options = type.options || {};
                if ('decimals' in options || 'precision' in options || '_decimals' in type || '_precision' in type) {
                    property.type = 'number';
                }

                if ('binary' in options || '_binary' in options) {
                    property.type = 'string';

                    const length = options.length || type._length;
                    if (length) {
                        property.maxLength = length;
                    }
                }

                if ('values' in options || 'values' in type) {
                    property.type = 'string';
                    property.enum = property.enum || options.values || type.values;
                }
            }

            collection[key] = property;

            return collection;
        }, {});
    }

    /**
     * Convert required
     *
     * @param   {Object} schemas
     * @returns {Object}
     */
    required(schemas) {
        const result = (schemas.key || []).concat(schemas.required || []);
        Object.keys(schemas.properties).forEach(function (key) {
            if (schemas.properties[key].required) {
                result.push(key);
            }

            if (schemas.properties[key].primaryKey) {
                result.push(key);
            }

            if ('allowNull' in schemas.properties[key] && !schemas.properties[key].allowNull) {
                result.push(key);
            }
        });

        return Array.from(new Set(result));
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
