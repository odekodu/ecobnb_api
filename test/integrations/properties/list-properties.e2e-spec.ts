import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Connection } from 'mongoose';
import { DatabaseService } from '../../../src/database/database.service';
import { AppModule } from '../../../src/app.module';
import { Fixture } from '../../fixture';
import { RedisCacheService } from '../../../src/redis-cache/redis-cache.service';
import { RedisCacheKeys } from '../../../src/redis-cache/redis-cache.keys';
import { SortEnum } from '../../../src/shared/sort.enum';
import { ConfigService } from '@nestjs/config';
import { expect } from 'chai';

describe('List Properties', () => {
  let app: INestApplication;
  let httpServer: any;
  let moduleFixture: TestingModule;
  let dbConnection: Connection;
  let fixture: Fixture;
  let redisCacheService: RedisCacheService
  let user: any;
  let property: any;
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
    await redisCacheService.del(RedisCacheKeys.LIST_PROPERTIES, true);
    user = await fixture.createUser();
    property = await fixture.createProperty(user);
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

  it('should get 1 property', async () => {        
    const response = await request(httpServer)
      .get(`/properties`);     

    expect(response.status).to.equal(HttpStatus.OK);      
    expect(response.body.success).to.equal(true);
    expect(response.body.payload.length).to.equal(1);
  });

  it('should get 2 properties', async () => {  
    await fixture.createProperty(user);      
    const response = await request(httpServer)
      .get(`/properties`);

    expect(response.status).to.equal(HttpStatus.OK);      
    expect(response.body.success).to.equal(true);
    expect(response.body.payload.length).to.equal(2);
  });

  it('should get reverse properties when sort is asc', async () => {  
    await fixture.createProperty(user);      
    const response = await request(httpServer)
      .get(`/properties?sort=${SortEnum.asc}`);      
    
    expect(response.status).to.equal(HttpStatus.OK);      
    expect(response.body.success).to.equal(true);
    expect(response.body.payload.length).to.equal(2);
    expect(response.body.payload[0]._id).to.equal(property._id);
  });

  it('should get 1 property when limit is 1', async () => {  
    await fixture.createProperty(user);      
    const response = await request(httpServer)
      .get(`/properties?limit=1`);

    expect(response.status).to.equal(HttpStatus.OK);      
    expect(response.body.success).to.equal(true);
    expect(response.body.payload.length).to.equal(1);
  });

  it('should get second property when offset is 1', async () => {  
    await fixture.createProperty(user);      
    const response = await request(httpServer)
      .get(`/properties?limit=1&offset=1`);

    expect(response.status).to.equal(HttpStatus.OK);      
    expect(response.body.success).to.equal(true);
    expect(response.body.payload.length).to.equal(1);
    expect(response.body.payload[0]._id).to.equal(property._id);
  });

  it('should get only searched properties', async () => {  
    await fixture.createProperty(user, { title: 'New Property'});      
    const response = await request(httpServer)
      .get(`/properties?query=new`);
    
    expect(response.status).to.equal(HttpStatus.OK);      
    expect(response.body.success).to.equal(true);
    expect(response.body.payload.length).to.equal(1);
    expect(response.body.payload[0].title).to.equal('New Property');
  });
});