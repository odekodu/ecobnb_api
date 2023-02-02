import * as Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';

export const CreateRentValidator = Joi.object({
  property: Joi.string()
  .required()
  .length(uuidv4().length)
  .error(() => {
    return new Error('"property" is not a valid uuid')
  }),
  duration: Joi.number().positive().min(1).required()
});
