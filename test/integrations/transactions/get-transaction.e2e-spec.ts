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
import { expect } from 'chai';

describe('Get Transaction', () => {
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

  it('should fail when invalid id is sent', async () => {        
    const response = await request(httpServer)
      .get(`/transactions/${1}`);

    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);      
    expect(response.body).to.deep.include({
      success: false,
      message: '"id" is not a valid uuid'
    });
  });

  it('should fail when transaction is not found', async () => {   
    const id = transaction._id.toString().split('').reverse().join('');  
               
    const response = await request(httpServer)
      .get(`/transactions/${id}`);        

    expect(response.status).to.equal(HttpStatus.NOT_FOUND);      
    expect(response.body).to.deep.include({
      success: false,
      message: 'Transaction not found'
    });
  });

  it('should get the transaction', async () => {        
    const response = await request(httpServer)
      .get(`/transactions/${transaction._id}`);     

    expect(response.status).to.equal(HttpStatus.OK);      
    expect(response.body.payload).to.deep.include(transactionStub);
  });
});