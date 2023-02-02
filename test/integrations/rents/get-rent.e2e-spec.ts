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
import { rentStub } from '../../stubs/rent.stubs';
import { expect } from 'chai';

describe('Get Rent', () => {
  let app: INestApplication;
  let httpServer: any;
  let moduleFixture: TestingModule;
  let dbConnection: Connection;
  let fixture: Fixture;
  let user: any;
  let rent: any;
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
    rent = await fixture.requestRent(user);
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
      .get(`/rents/${1}`);

    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);      
    expect(response.body).to.deep.include({
      success: false,
      message: '"id" is not a valid uuid'
    });
  });

  it('should fail when rent is not found', async () => {   
    const id = rent._id.toString().split('').reverse().join('');  
               
    const response = await request(httpServer)
      .get(`/rents/${id}`);        

    expect(response.status).to.equal(HttpStatus.NOT_FOUND);      
    expect(response.body).to.deep.include({
      success: false,
      message: 'Rent not found'
    });
  });

  it('should get the rent', async () => {        
    const response = await request(httpServer)
      .get(`/rents/${rent._id}`);     

    expect(response.status).to.equal(HttpStatus.OK);      
    expect(response.body.payload).to.deep.include(rentStub);
  });
});