import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Connection } from 'mongoose';
import { DatabaseService } from '../../../src/database/database.service';
import { AppModule } from '../../../src/app.module';
import { Fixture } from '../../fixture';
import { RedisCacheService } from '../../../src/redis-cache/redis-cache.service';
import { ConfigService } from '@nestjs/config';
import { SortEnum } from '../../../src/shared/sort.enum';
import { RedisCacheKeys } from '../../../src/redis-cache/redis-cache.keys';
import * as sinon from 'sinon';
import { expect } from 'chai';

describe('List Notifications', () => {
  let app: INestApplication;
  let httpServer: any;
  let moduleFixture: TestingModule;
  let dbConnection: Connection;
  let fixture: Fixture;
  let user: any;
  let authorization: string;
  let notification: any;
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
    await redisCacheService.del(RedisCacheKeys.LIST_NOTIFICATIONS, true);
    user = await fixture.createUser();
    notification = await fixture.createNotification(user);
    authorization = await fixture.login(user);
  });

  afterEach(async() => {
    await dbConnection.collection('users').deleteMany({});
    await dbConnection.collection('notifications').deleteMany({});
  });

  after(async () => {
    await dbConnection.dropDatabase();
    await app.close();
    await moduleFixture.close();
  });

  it('should get 1 notification', async () => {        
    const response = await request(httpServer)
      .get(`/notifications`)
      .set('authorization', authorization);

    expect(response.status).to.equal(HttpStatus.OK);      
    expect(response.body.success).to.equal(true);
    expect(response.body.payload.length).to.equal(1);
  });

  it('should get 2 notifications', async () => {  
    await fixture.createNotification(user);      
    const response = await request(httpServer)
      .get(`/notifications`)
      .set('authorization', authorization);
    
    expect(response.status).to.equal(HttpStatus.OK);      
    expect(response.body.success).to.equal(true);
    expect(response.body.payload.length).to.equal(2);
  });

  it('should get reverse notifications when sort is asc', async () => {  
    await fixture.createNotification(user);      
    const response = await request(httpServer)
      .get(`/notifications?sort=${SortEnum.asc}`)
      .set('authorization', authorization);      
    
    expect(response.status).to.equal(HttpStatus.OK);      
    expect(response.body.success).to.equal(true);
    expect(response.body.payload.length).to.equal(2);
    expect(response.body.payload[0]._id).to.equal(notification._id);
  });

  it('should get 1 notification when limit is 1', async () => {  
    await fixture.createNotification(user);      
    const response = await request(httpServer)
      .get(`/notifications?limit=1`)
      .set('authorization', authorization);

    expect(response.status).to.equal(HttpStatus.OK);      
    expect(response.body.success).to.equal(true);
    expect(response.body.payload.length).to.equal(1);
  });

  it('should get second notification when offset is 1', async () => {  
    await fixture.createNotification(user);      
    const response = await request(httpServer)
      .get(`/notifications?limit=1&offset=1`)
      .set('authorization', authorization);

    expect(response.status).to.equal(HttpStatus.OK);      
    expect(response.body.success).to.equal(true);
    expect(response.body.payload.length).to.equal(1);
    expect(response.body.payload[0]._id).to.equal(notification._id);
  });

  it('should fail when invalid minDate is provided', async () => {  
    await fixture.createNotification(user);      
    const response = await request(httpServer)
      .get(`/notifications?&minDate=hey`)
      .set('authorization', authorization);    
    
    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);      
    expect(response.body).to.deep.include({
      success: false,
      message: '"minDate" must be in timestamp or number of milliseconds format'
    });
  });

  it('should fail when invalid maxDate is provided', async () => {  
    await fixture.createNotification(user);      
    const response = await request(httpServer)
      .get(`/notifications?&maxDate=hey`)
      .set('authorization', authorization);    
    
    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);      
    expect(response.body).to.deep.include({
      success: false,
      message: '"maxDate" must be in timestamp or number of milliseconds format'
    });
  });

  it('should fail when minDate is greater than maxDate', async () => {  
    const minDate = new Date(2000, 1, 1).getTime();
    const maxDate = new Date(1999, 1, 1).getTime();

    await fixture.createNotification(user);      
    const response = await request(httpServer)
      .get(`/notifications?maxDate=${maxDate}&minDate=${minDate}`)
      .set('authorization', authorization);    
    
    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);      
    expect(response.body).to.deep.include({
      success: false,
      message: '"minDate" must be less than or equal to "ref:maxDate"'
    });
  });

  it('should get only notifications within 2000-1-1 to 2001-1-1', async () => {  
    const minDate = new Date(2000, 1, 1).getTime();
    const maxDate = new Date(2001, 1, 1).getTime();    

    const clock = sinon.useFakeTimers(new Date(1999, 12, 1));
    await fixture.createNotification(user);          

    clock.tick(1000 * 60 * 60 * 24 * 365);
    await fixture.createNotification(user);      

    clock.tick(1000 * 60 * 60 * 24 * 365);
    await fixture.createNotification(user);   

    const auth = await fixture.login(user);
    const response = await request(httpServer)
    .get(`/notifications?maxDate=${maxDate}&minDate=${minDate}`)
    .set('authorization', auth);    
    
    expect(response.status).to.equal(HttpStatus.OK);      
    expect(response.body.success).to.equal(true);
    expect(response.body.payload.length).to.equal(1);

    clock.restore();
  });
});