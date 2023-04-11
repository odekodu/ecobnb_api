import * as Joi from 'joi';
import { ListValidator } from '../../../shared/list.validator';

export const ListUsersValidator = Joi.object({
  ...ListValidator,
  query: Joi.string().default('')
});
