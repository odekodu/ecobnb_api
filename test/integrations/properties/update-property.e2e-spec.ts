import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Connection } from 'mongoose';
import { DatabaseService } from '../../../src/database/database.service';
import { AppModule } from '../../../src/app.module';
import { Fixture } from '../../fixture';
import { RedisCacheService } from '../../../src/redis-cache/redis-cache.service';
import { ConfigService } from '@nestjs/config';
import { propertyStub } from '../../stubs/property.stubs';
import { expect } from 'chai';

describe('Remove Property', () => {
  let app: INestApplication;
  let httpServer: any;
  let moduleFixture: TestingModule;
  let dbConnection: Connection;
  let fixture: Fixture;
  let user: any;
  let property: any;
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
    property = await fixture.createProperty(user);
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

  it('should fail when invalid id is sent', async () => {        
    const response = await request(httpServer)
      .patch(`/properties/${1}`)
      .set('authorization', authorization)
      .set('password', fixture.password);

    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);      
    expect(response.body).to.deep.include({
      success: false,
      message: '"id" is not a valid uuid'
    });
  });

  it('should fail when property is not found', async () => {   
    const id = property._id.toString().split('').reverse().join('');  
               
    const response = await request(httpServer)
      .patch(`/properties/${id}`)
      .set('authorization', authorization)
      .set('password', fixture.password);      

    expect(response.status).to.equal(HttpStatus.NOT_FOUND);      
    expect(response.body).to.deep.include({
      success: false,
      message: 'Property not found'
    });
  });

  it('should fail to update the property when user is not the owner', async () => {   
    const newUser: any = await fixture.createUser({ email: 'user@mail.com', phone: '12234567899' });
    const newAuthorization = await fixture.login(newUser);

    const response = await request(httpServer)
      .patch(`/properties/${property._id}`)
      .set('authorization', newAuthorization)
      .set('password', fixture.password);

    expect(response.status).to.equal(HttpStatus.UNAUTHORIZED);      
    expect(response.body).to.deep.include({
      success: false,
      message: 'You are not authorized'
    });
  });

  it('should fail when the price is not valid', async () => {        
    const response = await request(httpServer)
      .patch(`/properties/${property._id}`)
      .set('authorization', authorization)
      .set('password', fixture.password)
      .send({ price: 'Ten' })

    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);      
    expect(response.body).to.deep.include({
      success: false,
      message: '"price" must be a number'
    });
  });

  it('should update the property', async () => {        
    const response = await request(httpServer)
      .patch(`/properties/${property._id}`)
      .set('authorization', authorization)
      .set('password', fixture.password)
      .send({ price: 10000 })

    expect(response.status).to.equal(HttpStatus.OK);      
    expect(response.body.payload).to.deep.include({
      ...propertyStub,
      price: 10000
    });
  });
});