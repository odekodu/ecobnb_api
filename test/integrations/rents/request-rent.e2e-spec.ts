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
import { expect } from 'chai';

describe('Request Rent', () => {
  let app: INestApplication;
  let httpServer: any;
  let moduleFixture: TestingModule;
  let dbConnection: Connection;
  let fixture: Fixture;
  let user: any;
  let token: any;
  let property: any;
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
    token = await fixture.login(user);
    property = await fixture.createProperty(user);
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

  it('should fail when no property is provided', async () => {
    const response = await request(httpServer)
      .post('/rents')
      .set('token', token)
      .send({});    

    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);  
    expect(response.body).to.deep.include({
      success: false,
      message: '"property" is not a valid uuid'
    })  
  });

  it('should fail when no duration is provided', async () => {
    const { property: propertyId, duration } = createRentStub(property._id.toString().split('').reverse().join(''));

    const response = await request(httpServer)
      .post('/rents')
      .set('token', token)
      .send({ property: propertyId });    

    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);  
    expect(response.body).to.deep.include({
      success: false,
      message: '"duration" is required'
    })  
  });

  it('should fail when invalid duration is provided', async () => {
    const { property: propertyId } = createRentStub(property._id.toString().split('').reverse().join(''));

    const response = await request(httpServer)
      .post('/rents')
      .set('token', token)
      .send({ property: propertyId, duration: 'Five' });    

    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);  
    expect(response.body).to.deep.include({
      success: false,
      message: '"duration" must be a number'
    })  
  });

  it('should fail when property does not exist', async () => {
    const { property: propertyId, duration } = createRentStub(property._id.toString().split('').reverse().join(''));

    const response = await request(httpServer)
      .post('/rents')
      .set('token', token)
      .send({ property: propertyId, duration });    

    expect(response.status).to.equal(HttpStatus.NOT_FOUND);  
    expect(response.body).to.deep.include({
      success: false,
      message: 'Property not found'
    })  
  });

  it('should fail when property is not active', async () => {
    const { property: propertyId, duration } = createRentStub(property._id);

    const response = await request(httpServer)
      .post('/rents')
      .set('token', token)
      .send({ property: propertyId, duration });    

    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);  
    expect(response.body).to.deep.include({
      success: false,
      message: 'This property is not active at the moment'
    })  
  });

  it('should fail when duplicate rent request is found', async () => {
    const nProperty: any = await fixture.createProperty(user, { active: true });
    const { property: propertyId, duration } = createRentStub(nProperty._id);

    await request(httpServer)
      .post('/rents')
      .set('token', token)
      .send({ property: propertyId, duration });

    const response = await request(httpServer)
      .post('/rents')
      .set('token', token)
      .send({ property: propertyId, duration });    

    expect(response.status).to.equal(HttpStatus.CONFLICT);  
    expect(response.body).to.deep.include({
      success: false,
      message: 'You have an open rent request on this property'
    })  
  });

  it('should request rent successfully', async () => {
    const nProperty: any = await fixture.createProperty(user, { active: true });
    const { property: propertyId, duration } = createRentStub(nProperty._id);

    const response = await request(httpServer)
      .post('/rents')
      .set('token', token)
      .send({ property: propertyId, duration });    

    expect(response.status).to.equal(HttpStatus.CREATED);  
    expect(response.body.payload).to.deep.include(rentStub)  
  });
})