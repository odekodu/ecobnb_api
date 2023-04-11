import * as Joi from 'joi';
import { SortEnum } from './sort.enum';

export const ListValidator = {
  limit: Joi.number().min(1),
  offset: Joi.number().min(0),
  sort: Joi.string().valid(...Object.values(SortEnum)),
  minDate: Joi.date().timestamp().max(Joi.ref('maxDate')),
  maxDate: Joi.date().timestamp()
};
