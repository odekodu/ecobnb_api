import * as Joi from 'joi';
import { AccessRights } from '../../../shared/access.right';

export const UpdateUserValidator = Joi.object({
  rights: Joi.string().valid(...Object.values(AccessRights)),
  verified: Joi.boolean()
});
