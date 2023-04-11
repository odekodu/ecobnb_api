import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Connection } from 'mongoose';
import { DatabaseService } from '../../../src/database/database.service';
import { AppModule } from '../../../src/app.module';
import { Fixture } from '../../fixture';
import { RedisCacheService } from '../../../src/redis-cache/redis-cache.service';
import { ConfigService } from '@nestjs/config';
import { strict as assert } from 'assert';
import { expect } from 'chai';
import { NotificationsService } from '../../../src/domains/notifications/notifications.service';
import { createNotificationStub, notificationStub } from '../../stubs/notification.stub';

describe('Create Notification()', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let dbConnection: Connection;
  let fixture: Fixture;
  let user: any;
  let redisCacheService: RedisCacheService;
  let configService: ConfigService;
  let notificationsService: NotificationsService;

  before(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [
        AppModule
      ],
    }).compile();

    app = moduleFixture.createNestApplication();    
    await app.init();

    dbConnection = moduleFixture.get<DatabaseService>(DatabaseService).getConnection();
    redisCacheService = moduleFixture.get<RedisCacheService>(RedisCacheService);
    configService = moduleFixture.get<ConfigService>(ConfigService);
    fixture = new Fixture(dbConnection, redisCacheService, configService);
    notificationsService = moduleFixture.get<NotificationsService>(NotificationsService);
  });

  beforeEach(async () => {
    user = await fixture.createUser();
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

  it('should fail when no subject is provided', async () => {    
    await assert.rejects(notificationsService.createNotification({} as any, user._id), { name: 'ValidationError' });
  });

  it('should fail when no template is provided', async () => {    
    const { subject } = createNotificationStub;
    await assert.rejects(notificationsService.createNotification({ subject } as any, user._id), { name: 'ValidationError' });
  });

  it('should fail when no data is provided', async () => {    
    const { subject, template } = createNotificationStub;
    await assert.rejects(notificationsService.createNotification({ subject, template } as any, user._id), { name: 'ValidationError' });
  });

  it('should create the notification successfully', async () => {    
    const { subject, template, data } = createNotificationStub;
    const notification = await notificationsService.createNotification({ subject, template, data } as any, user._id);
    expect(notification).to.deep.include({ ...notificationStub });
  });
});
