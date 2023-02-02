import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SortEnum } from '../../shared/sort.enum';
import { MailService } from '../../mail/mail.service';
import { RedisCacheService } from '../../redis-cache/redis-cache.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { Transaction, TransactionDocument } from './entities/transaction.entity';
import { ListTransactionsResponse } from './responses/list-transactions.response';
import { TransactionResponse } from './responses/transaction.response';
import { TransactableEnum } from './dto/transactable.enum';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name) private readonly transactionModel: Model<TransactionDocument>,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private redisCacheService: RedisCacheService
  ){}

  async createTransaction(createTransactionDto: CreateTransactionDto) {    
    const model = await this.transactionModel.create(createTransactionDto);

    return this.getTransaction(model.get('_id'));
  }

  async listTransactions(
    limit = this.configService.get<number>('PAGE_LIMIT'),
    offset = 0,
    sort = SortEnum.desc,
    options: {
      minDate?: Date, 
      maxDate?: Date, 
      minAmount?: number, 
      maxAmount?: number,
      transactable?: TransactableEnum,
      item?: string
    }
  ) {    
    let { 
      minDate = new Date(1901), 
      maxDate = new Date(), 
      minAmount = Number.MIN_VALUE, 
      maxAmount = Number.MAX_VALUE 
    } = options;
    const { transactable, item } = options;

    minDate = new Date(Number(minDate));
    maxDate = new Date(Number(maxDate));
    minAmount = Number(minAmount);
    maxAmount = Number(maxAmount);
    
    let query: any = {
      hidden: false,
      $and: [
        { createdAt: { '$gte': minDate, '$lte': maxDate } },
        { amount : { '$gte': minAmount, '$lte': maxAmount } }
      ],
    };    

    if(transactable && item){
      query = { ...query, transactable, item };
    }
    
    const transactions = await this.transactionModel.find(query)
      .sort({ 'createdAt': sort })
      .limit(limit)
      .skip(offset * limit);
      
    return { success: true, payload: transactions.map(user => Transaction.toResponse(user)) } as ListTransactionsResponse;
  }

  async getTransaction(id: string) {
    const transaction = await this.transactionModel.findById(id);
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return { success: true, payload: Transaction.toResponse(transaction) } as TransactionResponse;
  }
}
