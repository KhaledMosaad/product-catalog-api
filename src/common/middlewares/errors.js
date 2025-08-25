const errorHandler = (err, req, res, next) => {
  const response = { status: 500, errors: 'Internal Server error', message: err.message };
  // Parse validation error
  if (err.isJoi) {
    errorType = 'validation';
    response.status = 400;
    response.message = '';

    const errors = { validation: { source: err.source, keys: [], details: [] } };

    // Concatenate all validation errors to be reported
    if (err.details) {
      err.details.forEach(detail => {
        response.message += `${detail.message.replace(/"/g, '\'')}\n`;
        const detailPath = detail.path.join('.');
        errors.validation.keys.push(detailPath);

        errors.validation.details.push({
          path: detail.path,
          message: `${detail.message.replace(/"/g, '\'')}`,
        });
      });
    }

    response.errors = errors;
  }

  res.status(response.status).json(response);
};

module.exports = { errorHandler };