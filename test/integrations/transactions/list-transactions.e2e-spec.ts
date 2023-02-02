import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Connection } from 'mongoose';
import { DatabaseService } from '../../../src/database/database.service';
import { AppModule } from '../../../src/app.module';
import { Fixture } from '../../fixture';
import { ErrorResponse } from '../../../src/errors/error.response';
import { RedisCacheService } from '../../../src/redis-cache/redis-cache.service';
import { ConfigService } from '@nestjs/config';
import { transactionStub } from '../../stubs/transaction.stubs';
import { TransactionResponse } from '../../../src/domains/transactions/responses/transaction.response';
import { SortEnum } from '../../../src/shared/sort.enum';
import { RedisCacheKeys } from '../../../src/redis-cache/redis-cache.keys';
import * as sinon from 'sinon';
import { format } from 'date-fns';
import { TransactableEnum } from '../../../src/domains/transactions/dto/transactable.enum';
import { expect } from 'chai';

describe('List Transactions', () => {
  let app: INestApplication;
  let httpServer: any;
  let moduleFixture: TestingModule;
  let dbConnection: Connection;
  let fixture: Fixture;
  let user: any;
  let transaction: any;
  let redisCacheService: RedisCacheService;
  let configService: ConfigService;

  before(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [
        AppModule
      ],
    }).compile();

    app = moduleFixture.createNestApplication();    
    await app.init();

    httpServer = app.getHttpServer();
    dbConnection = moduleFixture.get<DatabaseService>(DatabaseService).getConnection();
    redisCacheService = moduleFixture.get<RedisCacheService>(RedisCacheService);
    configService = moduleFixture.get<ConfigService>(ConfigService);
    fixture = new Fixture(dbConnection, redisCacheService, configService);
  });

  beforeEach(async () => {
    await redisCacheService.del(RedisCacheKeys.LIST_TRANSACTIONS, true);
    user = await fixture.createUser();
    transaction = await fixture.createTransaction(user);
  });

  afterEach(async() => {
    await dbConnection.collection('users').deleteMany({});
    await dbConnection.collection('properties').deleteMany({});
    await dbConnection.collection('rents').deleteMany({});
    await dbConnection.collection('transactions').deleteMany({});
  });

  after(async () => {
    await dbConnection.dropDatabase();
    await app.close();
    await moduleFixture.close();
  });

  it('should get 1 transaction', async () => {        
    const response = await request(httpServer)
      .get(`/transactions`);

    expect(response.status).to.equal(HttpStatus.OK);      
    expect(response.body.success).to.equal(true);
    expect(response.body.payload.length).to.equal(1);
  });

  it('should get 2 transactions', async () => {  
    await fixture.createTransaction(user);      
    const response = await request(httpServer)
      .get(`/transactions`);
    
    expect(response.status).to.equal(HttpStatus.OK);      
    expect(response.body.success).to.equal(true);
    expect(response.body.payload.length).to.equal(2);
  });

  it('should get reverse transactions when sort is asc', async () => {  
    await fixture.createTransaction(user);      
    const response = await request(httpServer)
      .get(`/transactions?sort=${SortEnum.asc}`);      
    
    expect(response.status).to.equal(HttpStatus.OK);      
    expect(response.body.success).to.equal(true);
    expect(response.body.payload.length).to.equal(2);
    expect(response.body.payload[0]._id).to.equal(transaction._id);
  });

  it('should get 1 rent when limit is 1', async () => {  
    await fixture.createTransaction(user);      
    const response = await request(httpServer)
      .get(`/transactions?limit=1`);

    expect(response.status).to.equal(HttpStatus.OK);      
    expect(response.body.success).to.equal(true);
    expect(response.body.payload.length).to.equal(1);
  });

  it('should get second transactions when offset is 1', async () => {  
    await fixture.createTransaction(user);      
    const response = await request(httpServer)
      .get(`/transactions?limit=1&offset=1`);

    expect(response.status).to.equal(HttpStatus.OK);      
    expect(response.body.success).to.equal(true);
    expect(response.body.payload.length).to.equal(1);
    expect(response.body.payload[0]._id).to.equal(transaction._id);
  });

  it('should fail when invalid minDate is provided', async () => {  
    await fixture.createTransaction(user);      
    const response = await request(httpServer)
      .get(`/transactions?&minDate=hey`);    
    
    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);      
    expect(response.body).to.deep.include({
      success: false,
      message: '"minDate" must be in timestamp or number of milliseconds format'
    });
  });

  it('should fail when invalid maxDate is provided', async () => {  
    await fixture.createTransaction(user);      
    const response = await request(httpServer)
      .get(`/transactions?&maxDate=hey`);    
    
    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);      
    expect(response.body).to.deep.include({
      success: false,
      message: '"maxDate" must be in timestamp or number of milliseconds format'
    });
  });

  it('should fail when minDate is greater than maxDate', async () => {  
    const minDate = new Date(2000, 1, 1).getTime();
    const maxDate = new Date(1999, 1, 1).getTime();

    await fixture.createTransaction(user);      
    const response = await request(httpServer)
      .get(`/transactions?maxDate=${maxDate}&minDate=${minDate}`);    
    
    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);      
    expect(response.body).to.deep.include({
      success: false,
      message: '"minDate" must be less than or equal to "ref:maxDate"'
    });
  });

  it('should fail when invalid minAmount is provided', async () => {  
    await fixture.createTransaction(user);      
    const response = await request(httpServer)
      .get(`/transactions?&minAmount=hey`);    
    
    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);      
    expect(response.body).to.deep.include({
      success: false,
      message: '"minAmount" must be a number'
    });
  });

  it('should fail when invalid maxAmount is provided', async () => {  
    await fixture.createTransaction(user);      
    const response = await request(httpServer)
      .get(`/transactions?&maxAmount=hey`);    
    
    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);      
    expect(response.body).to.deep.include({
      success: false,
      message: '"maxAmount" must be a number'
    });
  });

  it('should fail when minAmount is greater than maxAmount', async () => {  
    const minAmount = 1000;
    const maxAmount = 900;

    await fixture.createTransaction(user);      
    const response = await request(httpServer)
      .get(`/transactions?maxAmount=${maxAmount}&minAmount=${minAmount}`);    
    
    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);      
    expect(response.body).to.deep.include({
      success: false,
      message: '"minAmount" must be less than or equal to ref:maxAmount'
    });
  });

  it('should get only transactions within 2000-1-1 to 2001-1-1', async () => {  
    const minDate = new Date(2000, 1, 1).getTime();
    const maxDate = new Date(2001, 1, 1).getTime();    

    const clock = sinon.useFakeTimers(new Date(1999, 12, 1));
    await fixture.createTransaction(user);          

    clock.tick(1000 * 60 * 60 * 24 * 365);
    await fixture.createTransaction(user);      

    clock.tick(1000 * 60 * 60 * 24 * 365);
    await fixture.createTransaction(user);   

    const response = await request(httpServer)
    .get(`/transactions?maxDate=${maxDate}&minDate=${minDate}`);    
    
    expect(response.status).to.equal(HttpStatus.OK);      
    expect(response.body.success).to.equal(true);
    expect(response.body.payload.length).to.equal(1);

    clock.restore();
  });

  it('should get only transactions before 1000 to 3000', async () => {  
    const minAmount = 1000;
    const maxAmount = 3000;

    await fixture.createTransaction(user, { amount: 1000 });          
    await fixture.createTransaction(user, { amount: 5000 });          
    await fixture.createTransaction(user, { amount: 7000 });          

    const response = await request(httpServer)
    .get(`/transactions?maxAmount=${maxAmount}&minAmount=${minAmount}`);    
    
    expect(response.status).to.equal(HttpStatus.OK);      
    expect(response.body.success).to.equal(true);    
    expect(response.body.payload.length).to.equal(1);
  });

  it('should fail when transactable is provided and no item is provided', async () => {  
    const minAmount = 1000;
    const maxAmount = 3000;

    await fixture.createTransaction(user, { amount: 1000 });          
    await fixture.createTransaction(user, { amount: 5000 });          
    await fixture.createTransaction(user, { amount: 7000 });          

    const response = await request(httpServer)
    .get(`/transactions?transactable=${TransactableEnum.RENT}`);    
    
    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);      
    expect(response.body).to.deep.include({
      success: false,
      message: '"item" is required'
    });
  });

  it('should get the transactions for rent on a particular property', async () => {  
    await fixture.createTransaction(user);          
    await fixture.createTransaction(user);          

    const response = await request(httpServer)
    .get(`/transactions?transactable=${TransactableEnum.RENT}&item=${transaction.item}`);    
    
    expect(response.status).to.equal(HttpStatus.OK);      
    expect(response.body.success).to.equal(true);        
    expect(response.body.payload.length).to.equal(1);
  });
});