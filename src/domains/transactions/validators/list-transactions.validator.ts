import * as Joi from 'joi';
import { SortEnum } from '../../../shared/sort.enum';
import { TransactableEnum } from '../dto/transactable.enum';

export const ListTransactionsValidator = Joi.object({
  limit: Joi.number().min(1),
  offset: Joi.number().min(0),
  sort: Joi.string().valid(...Object.values(SortEnum)),
  minDate: Joi.date().timestamp().max(Joi.ref('maxDate')),
  maxDate: Joi.date().timestamp(),
  minAmount: Joi.number().positive().max(Joi.ref('maxAmount')),
  maxAmount: Joi.number().positive(),
  transactable: Joi.string().valid(...Object.values(TransactableEnum)),
  item: Joi.string().when(Joi.ref('transactable'), [
    { is: TransactableEnum.RENT, then: Joi.required() },
    { is: TransactableEnum.SUBSCRIPTION, then: Joi.required() }
  ])
});
