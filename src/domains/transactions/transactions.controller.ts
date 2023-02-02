import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpStatus, Query, CacheKey } from '@nestjs/common';
import { ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JoiValidationPipe } from '../../pipes/joi-validation.pipe';
import { IdValidator } from '../../shared/id.validator';
import { ErrorResponse } from '../../errors/error.response';
import { AuthorizeGuard } from '../../guards/authorize.guard';
import { TransactionResponse } from './responses/transaction.response';
import { TransactionsService } from './transactions.service';
import { ListTransactionsResponse } from './responses/list-transactions.response';
import * as Joi from 'joi';
import { SortEnum } from '../../shared/sort.enum';
import { RedisCacheKeys } from '../../redis-cache/redis-cache.keys';
import { ListTransactionsValidator } from './validators/list-transactions.validator';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @ApiQuery({ name: 'limit', required: false, description: 'The max number of users to fetch', type: Number })
  @ApiQuery({ name: 'offset', required: false, description: 'The page number to fetch', type: Number })
  @ApiQuery({ name: 'sort', required: false, description: 'The order of sorting', enum: SortEnum, type: String })
  @ApiQuery({ name: 'minDate', required: false, description: 'The date to start from', type: Number })
  @ApiQuery({ name: 'maxDate', required: false, description: 'The date to stop at', type: Number })
  @ApiQuery({ name: 'minAmount', required: false, description: 'The minimum amount to fetch', enum: SortEnum, type: String })
  @ApiQuery({ name: 'maxAmount', required: false, description: 'The maximum amount to fetch', enum: SortEnum, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: ListTransactionsResponse })
  @CacheKey(RedisCacheKeys.LIST_TRANSACTIONS)
  @Get()
  listTransactions(
    @Query(new JoiValidationPipe(ListTransactionsValidator)) { limit, offset, sort, minDate, maxDate, minAmount, maxAmount, transactable, item }: any
  ) {
    return this.transactionsService.listTransactions(limit, offset, sort, { minDate, maxDate, minAmount, maxAmount, transactable, item });
  }

  @ApiResponse({ status: HttpStatus.OK, type: TransactionResponse })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ErrorResponse })
  @CacheKey(RedisCacheKeys.GET_TRANSACTION)
  @Get(':id')
  getTransaction(
    @Param('id', new JoiValidationPipe(IdValidator())) id: string
  ) {
    return this.transactionsService.getTransaction(id);
  }
}
