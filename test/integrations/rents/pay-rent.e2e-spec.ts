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
import { RentResponse } from '../../../src/domains/rents/responses/rent.response';
import { createRentStub, rentStub } from '../../stubs/rent.stubs';
import { RentState } from '../../../src/shared/rent.state';
import { createTransactionStub } from '../../stubs/transaction.stubs';
import { TransactableEnum } from '../../../src/domains/transactions/dto/transactable.enum';
import { expect } from 'chai';

describe('Pay Rent', () => {
  let app: INestApplication;
  let httpServer: any;
  let moduleFixture: TestingModule;
  let dbConnection: Connection;
  let fixture: Fixture;
  let user: any;
  let newUser: any;
  let property: any;
  let rent: any;
  let token: string;
  let newToken: string;
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
    newUser = await fixture.createUser({ email: 'user@mail.com', phone: '12345678990'});
    property = await fixture.createProperty(user);
    rent = await fixture.requestRent(newUser, property);
    token = await fixture.login(user);
    newToken = await fixture.login(newUser);
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
    const response = await request(httpServer)
      .patch(`/rents/${rent._id}/pay`)
      .set('token', token)
      .send({ });    

    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);  
    expect(response.body).to.deep.include({
      success: false,
      message: '"amount" is required'
    })  
  });

  it('should fail when invalid amount is provided', async () => {
    const response = await request(httpServer)
      .patch(`/rents/${rent._id}/pay`)
      .set('token', token)
      .send({ amount: 'aaa' });    

    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);  
    expect(response.body).to.deep.include({
      success: false,
      message: '"amount" must be a number'
    })  
  });

  it('should fail when no from is provided', async () => {
    const { amount } = createTransactionStub(rent._id, TransactableEnum.RENT);
    const response = await request(httpServer)
      .patch(`/rents/${rent._id}/pay`)
      .set('token', token)
      .send({ amount });    

    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);  
    expect(response.body).to.deep.include({
      success: false,
      message: '"from" is required'
    })  
  });

  it('should fail when no to is provided', async () => {
    const { amount, from } = createTransactionStub(rent._id, TransactableEnum.RENT);
    const response = await request(httpServer)
      .patch(`/rents/${rent._id}/pay`)
      .set('token', token)
      .send({ amount, from });    

    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);  
    expect(response.body).to.deep.include({
      success: false,
      message: '"to" is required'
    })  
  });

  it('should fail when no transactable is provided', async () => {
    const { amount, from, to } = createTransactionStub(rent._id, TransactableEnum.RENT);
    const response = await request(httpServer)
      .patch(`/rents/${rent._id}/pay`)
      .set('token', token)
      .send({ amount, from, to });    

    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);  
    expect(response.body).to.deep.include({
      success: false,
      message: '"transactable" is required'
    })  
  });

  it('should fail when invalid transactable is provided', async () => {
    const { amount, from, to } = createTransactionStub(rent._id, TransactableEnum.RENT);
    const response = await request(httpServer)
      .patch(`/rents/${rent._id}/pay`)
      .set('token', token)
      .send({ amount, from, to, transactable: 'something' });    

    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);  
    expect(response.body).to.deep.include({
      success: false,
      message: '"transactable" must be one of [RENT, SUBSCRIPTION]'
    })  
  });

  it('should fail when no item is provided', async () => {
    const { amount, from, to, transactable } = createTransactionStub(rent._id, TransactableEnum.RENT);
    const response = await request(httpServer)
      .patch(`/rents/${rent._id}/pay`)
      .set('token', token)
      .send({ amount, from, to, transactable });    

    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);  
    expect(response.body).to.deep.include({
      success: false,
      message: '"item" is not a valid uuid'
    })  
  });

  it('should fail when no tag is provided', async () => {
    const { amount, from, to, transactable, item, platform } = createTransactionStub(rent._id, TransactableEnum.RENT);
    const response = await request(httpServer)
      .patch(`/rents/${rent._id}/pay`)
      .set('token', token)
      .send({ amount, from, to, transactable, item, platform });    

    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);  
    expect(response.body).to.deep.include({
      success: false,
      message: '"reference" is required'
    })  
  });

  it('should fail when invalid id is sent', async () => {  
    const { amount, from, to, transactable, item, platform, reference } = createTransactionStub(rent._id, TransactableEnum.RENT);      
    const response = await request(httpServer)
      .patch(`/rents/${1}/pay`)
      .set('token', token)
      .send({ amount, from, to, transactable, item, platform, reference });    

    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);      
    expect(response.body).to.deep.include({
      success: false,
      message: '"id" is not a valid uuid'
    });
  });

  it('should fail when rent is not found', async () => {   
    const id = rent._id.toString().split('').reverse().join('');  
    const { amount, from, to, transactable, item, platform, reference } = createTransactionStub(rent._id, TransactableEnum.RENT);  

    const response = await request(httpServer)
      .patch(`/rents/${id}/pay`)
      .set('token', token)
      .send({ amount, from, to, transactable, item, platform, reference });       

    expect(response.status).to.equal(HttpStatus.NOT_FOUND);      
    expect(response.body).to.deep.include({
      success: false,
      message: 'Rent not found'
    });
  });

  it('should fail when payment is not of transactable rent', async () => {   
    const { amount, from, to, item, platform, reference } = createTransactionStub(rent._id, TransactableEnum.RENT);  

    const response = await request(httpServer)
      .patch(`/rents/${rent._id}/pay`)
      .set('token', token)
      .send({ amount, from, to, transactable: TransactableEnum.SUBSCRIPTION, item, platform, reference });       

    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);      
    expect(response.body).to.deep.include({
      success: false,
      message: 'Transaction mismatch: Transaction not meant for this rent'
    });
  });

  it('should fail when payment item does not match the rent id', async () => {   
    const { amount, from, to, platform, reference } = createTransactionStub(rent._id, TransactableEnum.RENT);  

    const response = await request(httpServer)
      .patch(`/rents/${rent._id}/pay`)
      .set('token', token)
      .send({ amount, from, to, transactable: TransactableEnum.SUBSCRIPTION, item: user._id, platform, reference });       

    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);      
    expect(response.body).to.deep.include({
      success: false,
      message: 'Transaction mismatch: Transaction not meant for this rent'
    });
  });

  it('should fail when rent is not at paying state', async () => {        
    const { amount, from, to, transactable, item, platform, reference } = createTransactionStub(rent._id, TransactableEnum.RENT);  
    const response = await request(httpServer)
      .patch(`/rents/${rent._id}/pay`)
      .set('token', newToken)
      .send({ amount, from, to, transactable, item, platform, reference });       

    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);      
    expect(response.body).to.deep.include({
      success: false,
      message: 'Only rents at (paying) state can be paid'
    });
  });

  it('should pay rent', async () => {        
    await fixture.rentCollection.updateOne({ _id: rent._id }, { $set: { status: RentState.PAYING } });

    const { amount, from, to, transactable, item, platform, reference } = createTransactionStub(rent._id, TransactableEnum.RENT);  
    const response = await request(httpServer)
      .patch(`/rents/${rent._id}/pay`)
      .set('token', newToken)
      .send({ amount, from, to, transactable, item, platform, reference });       

    expect(response.status).to.equal(HttpStatus.OK);      
    expect(response.body.payload).to.deep.include({ ...rentStub, status: RentState.PAID });
  });
});