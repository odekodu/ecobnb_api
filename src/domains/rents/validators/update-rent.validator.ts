import * as Joi from 'joi';
import { RentState } from '../../../shared/rent.state';

export const UpdateRentValidator = Joi.object({
  status: Joi.string().valid(...Object.values(RentState)),
  duration: Joi.number().positive().min(1)
});
