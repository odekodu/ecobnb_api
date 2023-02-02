import { Test, TestingModule } from '@nestjs/testing';
import { expect } from 'chai';
import { TransactionsService } from './transactions.service';

describe('TransactionsService', () => {
  let service: TransactionsService;

  before(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransactionsService],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  it('should be defined', () => {
    expect(service).to.exist;
  });
});
