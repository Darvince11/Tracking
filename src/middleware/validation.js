class ValidationMiddleware {
  static validate(schema) {
    return (req, res, next) => {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: false
      });

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          type: detail.type
        }));

        return res.status(400).json({
          success: false,
          status: 'error',
          message: 'Validation failed',
          errorCode: 'VALIDATION_ERROR',
          errors
        });
      }

      req.body = value;
      next();
    };
  }

  static validateQuery(schema) {
    return (req, res, next) => {
      const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: false
      });

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          type: detail.type
        }));

        return res.status(400).json({
          success: false,
          status: 'error',
          message: 'Invalid query parameters',
          errorCode: 'QUERY_VALIDATION_ERROR',
          errors
        });
      }

      // THE FIX: Safely overwrite the Express read-only getter lock for req.query
      Object.defineProperty(req, 'query', {
        value: value,
        writable: true,
        configurable: true,
        enumerable: true
      });
      
      next();
    };
  }
}

module.exports = { ValidationMiddleware };
