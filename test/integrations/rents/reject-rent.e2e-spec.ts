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

describe('Reject Rent', () => {
  let app: INestApplication;
  let httpServer: any;
  let moduleFixture: TestingModule;
  let dbConnection: Connection;
  let fixture: Fixture;
  let user: any;
  let newUser: any;
  let property: any;
  let rent: any;
  let authorization: any;
  let newAuthorization: any;
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
    authorization = await fixture.login(user);
    newAuthorization = await fixture.login(newUser);
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
      .patch(`/rents/${1}/reject`)
      .set('authorization', authorization);

    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);      
    expect(response.body).to.deep.include({
      success: false,
      message: '"id" is not a valid uuid'
    });
  });

  it('should fail when rent is not found', async () => {   
    const id = rent._id.toString().split('').reverse().join('');  
               
    const response = await request(httpServer)
      .patch(`/rents/${id}/reject`)
      .set('authorization', authorization);      

    expect(response.status).to.equal(HttpStatus.NOT_FOUND);      
    expect(response.body).to.deep.include({
      success: false,
      message: 'Rent not found'
    });
  });

  it('should fail when occupant wants to reject rent', async () => {
    const response = await request(httpServer)
      .patch(`/rents/${rent._id}/reject`)
      .set('authorization', newAuthorization);

    expect(response.status).to.equal(HttpStatus.UNAUTHORIZED);      
    expect(response.body).to.deep.include({
      success: false,
      message: 'You are not authorized to reject your rent request'
    });
  });

  it('should fail when rejecting rent that is not in request or approved state', async () => {  
    await fixture.rentCollection.updateOne({ _id: rent._id }, { $set: { status: RentState.PAID } });

    const response = await request(httpServer)
      .patch(`/rents/${rent._id}/reject`)
      .set('authorization', authorization);

    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);      
    expect(response.body).to.deep.include({
      success: false,
      message: 'Only rents at (request or approved) state can be rejected'
    });
  });

  it('should fail when rejecting rent that is in paying state', async () => {  
    await fixture.rentCollection.updateOne({ _id: rent._id }, { $set: { status: RentState.PAYING } });

    const response = await request(httpServer)
      .patch(`/rents/${rent._id}/reject`)
      .set('authorization', authorization);

    expect(response.status).to.equal(HttpStatus.BAD_REQUEST);      
    expect(response.body).to.deep.include({
      success: false,
      message: 'The rent is currently on a paying state, you can not reject it'
    });
  });

  it('should reject rent', async () => {        
    const response = await request(httpServer)
      .patch(`/rents/${rent._id}/reject`)
      .set('authorization', authorization);

    expect(response.status).to.equal(HttpStatus.OK);      
    expect(response.body.payload).to.deep.include({ ...rentStub, status: RentState.REJECTED });
  });
});