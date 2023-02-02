import * as Joi from 'joi';
import { number } from 'joi';

export const CreatePropertyValidator = Joi.object({
  country: Joi.string().required(),
  state: Joi.string().required(),
  city: Joi.string().required(),
  address: Joi.string().required(),
  price: Joi.number().positive().required(),
  title: Joi.string().required(),
  description: Joi.string()
});
