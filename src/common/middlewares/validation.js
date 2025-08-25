const Joi = require('joi');
// General purpose validation middleware
// accept the request validation schema along with validation options
const validate = (schema, options) => {
  const { params: paramsSchema = {}, query: querySchema = {}, body: bodySchema = {} } = schema;

  const compiledParamsSchema = Joi.compile(paramsSchema);
  const compiledQuerySchema = Joi.compile(querySchema);
  const compiledBodySchema = Joi.compile(bodySchema);

  const validationOptions = { abortEarly: false, ...options };

  return (req, res, next) => {
    // Validate params if it has validation schema
    if (paramsSchema) {
      const { value: validatedParams, error } = compiledParamsSchema.validate(req.params, validationOptions);

      if (error) {
        error.source = 'params';
        next(error);
        return;
      }

      req.params = validatedParams;
    }

    // Validate query string if it has validation schema
    if (querySchema) {
      const { value: validatedQuery, error } = compiledQuerySchema.validate(req.query, validationOptions);

      if (error) {
        error.source = 'query';
        next(error);
        return;
      }

      req.query = validatedQuery;
    }

    // Validate body if it has validation schema
    if (bodySchema) {
      const { value: validatedBody, error } = compiledBodySchema.validate(req.body, validationOptions);

      if (error) {
        error.source = 'body';
        next(error);
        return;
      }

      req.body = validatedBody;
    }

    next();
  };
};

module.exports = { validate };