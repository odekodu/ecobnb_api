import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Connection } from 'mongoose';
import { DatabaseService } from '../../../src/database/database.service';
import { AppModule } from '../../../src/app.module';
import { Fixture } from '../../fixture';
import { RedisCacheService } from '../../../src/redis-cache/redis-cache.service';
import { ConfigService } from '@nestjs/config';
import { createTransactionStub } from '../../stubs/transaction.stubs';
import { TransactableEnum } from '../../../src/domains/transactions/dto/transactable.enum';
import { RentsService } from '../../../src/domains/rents/rents.service';
import { expect } from 'chai';
import { useFakeTimers } from 'sinon';
import { RentState } from '../../../src/shared/rent.state';

describe('Remind Rent()', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let dbConnection: Connection;
  let fixture: Fixture;
  let user: any;
  let newUser: any;
  let property: any;
  let rent: any;
  let redisCacheService: RedisCacheService;
  let configService: ConfigService;
  let rentService: RentsService;
  let transactionData: any;
  let clock = null;

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
    rentService = await moduleFixture.resolve<RentsService>(RentsService);
  });

  beforeEach(async () => {
    user = await fixture.createUser();
    newUser = await fixture.createUser({ email: 'user@mail.com', phone: '12345678990'});
    property = await fixture.createProperty(user);
    rent = await fixture.requestRent(newUser, property);
    transactionData = createTransactionStub(rent._id, TransactableEnum.RENT);
    clock = useFakeTimers(new Date(2000, 1, 1, 12));
  });

  afterEach(async() => {
    await dbConnection.collection('users').deleteMany({});
    await dbConnection.collection('properties').deleteMany({});
    await dbConnection.collection('rents').deleteMany({});
    if (clock) clock.restore();
  });

  after(async () => {
    await dbConnection.dropDatabase();
    await app.close();
    await moduleFixture.close();
  });

  it('should have 1 day when user books at 12am', async () => {  
    await fixture.createTransaction(newUser, transactionData);
    await fixture.rentCollection.updateOne({ _id: rent._id }, { $set: { status: RentState.PAID } });
    const timeLeft = await rentService.remindRent(rent);
    expect(timeLeft).to.deep.include({ daysLeft: 1 });
  });

  it('should have 0 days and 2hours', async () => {  
    await fixture.createTransaction(newUser, transactionData);
    await fixture.rentCollection.updateOne({ _id: rent._id }, { $set: { status: RentState.PAID } });
    clock.tick(1000 * 60 * 60 * 22);
    const timeLeft = await rentService.remindRent(rent);
    expect(timeLeft).to.deep.include({ daysLeft: 0, hoursLeft: 2 });
  });
});
