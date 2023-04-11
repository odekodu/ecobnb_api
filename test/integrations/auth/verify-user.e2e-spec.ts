import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Connection } from 'mongoose';
import { DatabaseService } from '../../../src/database/database.service';
import { AppModule } from '../../../src/app.module';
import { Fixture } from '../../fixture';
import { RedisCacheService } from '../../../src/redis-cache/redis-cache.service';
import { ConfigService } from '@nestjs/config';
import { expect } from 'chai';

describe('Verify User', () => {
  let app: INestApplication;
  let httpServer: any;
  let moduleFixture: TestingModule;
  let dbConnection: Connection;
  let fixture: Fixture;
  let user: any;
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

  afterEach(async() => {
    await dbConnection.collection('users').deleteMany({});
  });

  after(async () => {
    await dbConnection.dropDatabase();
    await app.close();
    await moduleFixture.close();
  });

  it('should fail when user code is not sent', async () => {                  
    const response = await request(httpServer)
      .post(`/auth/verify`)
      .send({ });        

    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);      
  });

  it('should fail when link has expired', async () => {                  
    const response = await request(httpServer)
      .post(`/auth/verify`)
      .send({ code: '133' });        

    expect(response.status).to.equal(HttpStatus.EXPECTATION_FAILED);      
    expect(response.body).to.deep.include({
      success: false,
      message: 'Verification link has expired'
    });
  });

  it('should fail when user has been deleted', async () => { 
    user = await fixture.createUser(); 
    await fixture.requestVerification(user._id, user.email);
    await dbConnection.collection('users').deleteOne({ _id: user._id });

    const response = await request(httpServer)
      .post(`/auth/verify`)
      .send({ code: fixture.verificationCode });        

    expect(response.status).to.equal(HttpStatus.NOT_FOUND);      
    expect(response.body).to.deep.include({
      success: false,
      message: 'User not found'
    });
  });

  it('should fail when user has been deleted', async () => { 
    user = await fixture.createUser(); 
    await fixture.requestVerification(user._id, user.email);
    const response = await request(httpServer)
      .post(`/auth/verify`)
      .send({ code: fixture.verificationCode });        

    expect(response.status).to.equal(HttpStatus.CREATED);      
    expect(response.body.success).to.equal(true);
  });
});