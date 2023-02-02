import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Connection } from 'mongoose';
import { DatabaseService } from '../../../src/database/database.service';
import { AppModule } from '../../../src/app.module';
import { Fixture } from '../../fixture';
import { RedisCacheService } from '../../../src/redis-cache/redis-cache.service';
import { ConfigService } from '@nestjs/config';
import { createRentStub, rentStub } from '../../stubs/rent.stubs';
import { RentState } from '../../../src/shared/rent.state';
import { expect } from 'chai';

describe('Cancel Rent', () => {
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

  it('should fail when invalid id is sent', async () => {        
    const response = await request(httpServer)
      .patch(`/rents/${1}/cancel`)
      .set('token', token);

    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);      
    expect(response.body).to.deep.include({
      success: false,
      message: '"id" is not a valid uuid'
    });
  });

  it('should fail when rent is not found', async () => {   
    const id = rent._id.toString().split('').reverse().join('');  
               
    const response = await request(httpServer)
      .patch(`/rents/${id}/cancel`)
      .set('token', token);      

    expect(response.status).to.equal(HttpStatus.NOT_FOUND);      
    expect(response.body).to.deep.include({
      success: false,
      message: 'Rent not found'
    });
  });

  it('should fail when cancelling for rent that is not yours', async () => {
    const response = await request(httpServer)
      .patch(`/rents/${rent._id}/cancel`)
      .set('token', token);

    expect(response.status).to.equal(HttpStatus.UNAUTHORIZED);      
    expect(response.body).to.deep.include({
      success: false,
      message: 'You are not authorized to cancel for this rent, it does not belong to you'
    });
  });

  it('should fail when rejecting rent that is in paying state', async () => {  
    await fixture.rentCollection.updateOne({ _id: rent._id }, { $set: { status: RentState.PAID } });

    const response = await request(httpServer)
      .patch(`/rents/${rent._id}/cancel`)
      .set('token', newToken);

    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);      
    expect(response.body).to.deep.include({
      success: false,
      message: 'Only rents at (request or approved) state can be canceled'
    });
  });

  it('should update rent state as paying', async () => {      
    await fixture.rentCollection.updateOne({ _id: rent._id }, { $set: { status: RentState.APPROVED } });
  
    const response = await request(httpServer)
      .patch(`/rents/${rent._id}/cancel`)
      .set('token', newToken);

    expect(response.status).to.equal(HttpStatus.OK);      
    expect(response.body.payload).to.deep.include({ ...rentStub, status: RentState.CANCELED });
  });
});