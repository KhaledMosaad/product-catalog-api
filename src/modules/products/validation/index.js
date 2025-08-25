const Joi = require('joi');

const searchValidation = {
  query: Joi.object({
    query: Joi.string().required(),
    filter: Joi.object(),
    limit: Joi.number().default(50),
    skip: Joi.number().default(0),
  })
};

module.exports = { searchValidation };