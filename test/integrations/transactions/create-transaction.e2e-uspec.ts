import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Connection } from 'mongoose';
import { DatabaseService } from '../../../src/database/database.service';
import { AppModule } from '../../../src/app.module';
import { Fixture } from '../../fixture';
import { RedisCacheService } from '../../../src/redis-cache/redis-cache.service';
import { ConfigService } from '@nestjs/config';
import { TransactionsService } from '../../../src/domains/transactions/transactions.service';
import { createTransactionStub } from '../../stubs/transaction.stubs';
import { strict as assert } from 'assert';
import { TransactableEnum } from '../../../src/domains/transactions/dto/transactable.enum';
import { TransactionResponse } from 'src/domains/transactions/responses/transaction.response';
import { expect } from 'chai';

describe('Create Transaction()', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let dbConnection: Connection;
  let fixture: Fixture;
  let user: any;
  let rent: any;
  let redisCacheService: RedisCacheService;
  let configService: ConfigService;
  let transactionService: TransactionsService;
  let transactionData: any;

  before(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [
        AppModule
      ],
    }).compile();

    app = moduleFixture.createNestApplication();    
    await app.init();

    dbConnection = moduleFixture.get<DatabaseService>(DatabaseService).getConnection();
    redisCacheService = moduleFixture.get<RedisCacheService>(RedisCacheService);
    configService = moduleFixture.get<ConfigService>(ConfigService);
    fixture = new Fixture(dbConnection, redisCacheService, configService);
    transactionService = moduleFixture.get<TransactionsService>(TransactionsService);
  });

  beforeEach(async () => {
    user = await fixture.createUser();
    rent = await fixture.requestRent(user);
    transactionData = createTransactionStub(rent._id, TransactableEnum.RENT);
  });

  afterEach(async() => {
    await dbConnection.collection('users').deleteMany({});
    await dbConnection.collection('properties').deleteMany({});
    await dbConnection.collection('rents').deleteMany({});
  });

  after(async () => {
    await dbConnection.dropDatabase();
    await app.close();
    await moduleFixture.close();
  });

  it('should fail when no amount is provided', async () => {    
    assert.rejects(transactionService.createTransaction({} as any), { name: 'ValidationError' });
  });

  it('should fail when no from is provided', async () => {    
    const { amount } = transactionData;
    assert.rejects(transactionService.createTransaction({ amount } as any), { name: 'ValidationError' });
  });

  it('should fail when no to is provided', async () => {    
    const { amount, from } = transactionData;
    assert.rejects(transactionService.createTransaction({ amount, from } as any), { name: 'ValidationError' });
  });

  it('should fail when no transactable is provided', async () => {    
    const { amount, from, to } = transactionData;
    assert.rejects(transactionService.createTransaction({ amount, from, to } as any), { name: 'ValidationError' });
  });

  it('should fail when no item is provided', async () => {    
    const { amount, from, to, transactable } = transactionData;
    assert.rejects(transactionService.createTransaction({ amount, from, to, transactable } as any), { name: 'ValidationError' });
  });

  it('should fail when no tag is provided', async () => {    
    const { amount, from, to, transactable, item } = transactionData;
    assert.rejects(transactionService.createTransaction({ amount, from, to, transactable, item } as any), { name: 'ValidationError' });
  });

  it('should create transaction', async () => {
    const data = await transactionService.createTransaction(transactionData);
    expect(data.payload).to.deep.include(transactionData)  
  });
});
