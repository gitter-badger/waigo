"use strict";





/**
 * Validator to ensure given field compared with another field in a certain way.
 *
 * @param {Object} options Options.
 * @param {String} options.field Field to compare to.
 * @param {String} options.comparison `gt`, `gte`, `lt`, `lte`, or `eq`.
 * 
 * @throws Error If not an email address.
 */
module.exports = function(options) {
  return function*(context, field, value) {
    var fields = field.form.fields,
      otherField = fields[options.field]

    if (!otherField) {
      throw new Error('Comparison field not found: ' + options.field);
    }

    switch (options.comparison) {
      case 'gte':
        if (value < otherField.value) {
          throw new Error('Must be greater than or equal to ' + otherField.label);
        }
        break;
      case 'gt':
        if (value <= otherField.value) {
          throw new Error('Must be greater than ' + otherField.label);
        }
        break;
      case 'lte':
        if (value > otherField.value) {
          throw new Error('Must be less than or equal to ' + otherField.label);
        }
        break;
      case 'lt':
        if (value >= otherField.value) {
          throw new Error('Must be less than ' + otherField.label);
        }
        break;
      default:
        if (value !== otherField.value) {
          throw new Error('Must be equal to ' + otherField.label);
        }
        break;
    }
  }
};
