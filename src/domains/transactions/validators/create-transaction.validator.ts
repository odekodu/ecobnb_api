import * as Joi from 'joi';
import { TransactableEnum } from '../dto/transactable.enum';
import { IdValidator } from '../../../shared/id.validator';

export const CreateTransactionValidator = Joi.object({
  amount: Joi.number().positive().required(),
  from: Joi.string().required(),
  to: Joi.string().required(),
  transactable: Joi.string().required().valid(...Object.values(TransactableEnum)),
  item: IdValidator('item'),
  platform: Joi.string().required(),
  reference: Joi.number().positive().required()
});
