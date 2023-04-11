import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Connection } from 'mongoose';
import { DatabaseService } from '../../../src/database/database.service';
import { AppModule } from '../../../src/app.module';
import { Fixture } from '../../fixture';
import { RedisCacheService } from '../../../src/redis-cache/redis-cache.service';
import { ConfigService } from '@nestjs/config';
import { createPropertyStub, propertyStub } from '../../stubs/property.stubs';
import { expect } from 'chai';

describe('Create Property', () => {
  let app: INestApplication;
  let httpServer: any;
  let moduleFixture: TestingModule;
  let dbConnection: Connection;
  let fixture: Fixture;
  let user: any;
  let authorization: any;
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
    authorization = await fixture.login(user);
  });

  afterEach(async() => {
    await dbConnection.collection('users').deleteMany({});
    await dbConnection.collection('properties').deleteMany({});
  });

  after(async () => {
    await dbConnection.dropDatabase();
    await app.close();
    await moduleFixture.close();
  });

  it('should fail when no country is provided', async () => {
    const response = await request(httpServer)
      .post('/properties')
      .set('authorization', authorization)
      .send({});    

    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);  
    expect(response.body).to.deep.include({
      success: false,
      message: '"country" is required'
    })  
  });

  it('should fail when no state is provided', async () => {
    const { country } = createPropertyStub;
    const response = await request(httpServer)
      .post('/properties')
      .set('authorization', authorization)
      .send({ country });   

    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);  
    expect(response.body).to.deep.include({
      success: false,
      message: '"state" is required'
    })  
  });

  it('should fail when no city is provided', async () => {
    const { country, state } = createPropertyStub;
    const response = await request(httpServer)
      .post('/properties')
      .set('authorization', authorization)
      .send({ country, state });   

    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);  
    expect(response.body).to.deep.include({
      success: false,
      message: '"city" is required'
    })  
  });

  it('should fail when no address is provided', async () => {
    const { country, state, city } = createPropertyStub;
    const response = await request(httpServer)
      .post('/properties')
      .set('authorization', authorization)
      .send({ country, state, city });    

    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);  
    expect(response.body).to.deep.include({
      success: false,
      message: '"address" is required'
    })  
  });

  it('should fail when no price is provided', async () => {
    const { country, state, city, address } = createPropertyStub;
    const response = await request(httpServer)
      .post('/properties')
      .set('authorization', authorization)
      .send({ country, state, city, address });   

    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);  
    expect(response.body).to.deep.include({
      success: false,
      message: '"price" is required'
    })  
  });

  it('should fail when invalid price is provided', async () => {
    const { country, state, city, address } = createPropertyStub;
    const response = await request(httpServer)
      .post('/properties')
      .set('authorization', authorization)
      .send({ country, state, city, address, price: 'Ten' });   

    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);  
    expect(response.body).to.deep.include({
      success: false,
      message: '"price" must be a number'
    })  
  });

  it('should fail when no title is provided', async () => {
    const { country, state, city, address, price } = createPropertyStub;
    const response = await request(httpServer)
      .post('/properties')
      .set('authorization', authorization)
      .send({ country, state, city, address, price });   

    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);  
    expect(response.body).to.deep.include({
      success: false,
      message: '"title" is required'
    })  
  });

  it('should create a property when all data is valid', async () => {        
    const { country, state, city, address, price, title, description } = createPropertyStub;
    const response = await request(httpServer)
      .post('/properties')
      .set('authorization', authorization)
      .send({ country, state, city, address, price, title, description });      

    expect(response.status).to.equal(HttpStatus.CREATED);      
    expect(response.body.payload).to.deep.include(propertyStub);
  });
});