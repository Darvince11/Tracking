const Joi = require('joi');

class UserValidator {
  static createUser() {
    return Joi.object({
      firstName: Joi.string().min(2).max(50).trim().required(),
      lastName: Joi.string().min(2).max(50).trim().required(),
      email: Joi.string().email().max(255).lowercase().trim().required(),
      password: Joi.string().min(8).required(),
      department: Joi.string().valid(
        'WEB_DEVELOPMENT', 'CYBERSECURITY', 'CLOUD_COMPUTING',
        'POS_SYSTEMS', 'NETWORKING', 'DATA_ANALYTICS'
      ).required(),
      role: Joi.string().valid('ADMIN', 'EMPLOYEE').default('EMPLOYEE')
    });
  }

  static updatePassword() {
    return Joi.object({
      currentPassword: Joi.string().required(),
      newPassword: Joi.string().min(12).max(128)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()])/)
        .required()
        .messages({
          'string.pattern.base': 'Password must contain uppercase, lowercase, number, and special character'
        }),
      confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
        .messages({ 'any.only': 'Passwords do not match' })
    });
  }
}

module.exports = { UserValidator };