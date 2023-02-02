import * as Joi from 'joi';

export const UpdatePropertyValidator = Joi.object({
  country: Joi.string(),
  state: Joi.string(),
  city: Joi.string(),
  address: Joi.string(),
  price: Joi.number().positive(),
  title: Joi.string(),
  description: Joi.string(),
  active: Joi.boolean()
});
