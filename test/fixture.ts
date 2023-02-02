import { Collection, Connection } from 'mongoose';
import { createUserStub } from './stubs/user.stubs';
import { v4 as uuidv4 } from 'uuid';
import { RedisCacheKeys } from '../src/redis-cache/redis-cache.keys';
import { RedisCacheService } from '../src/redis-cache/redis-cache.service';
import { User } from '../src/domains/users/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { sign } from 'jsonwebtoken';
import { createPropertyStub } from './stubs/property.stubs';
import { RentState } from '../src/shared/rent.state';
import { Property } from '../src/domains/properties/entities/property.entity';
import { createTransactionStub } from './stubs/transaction.stubs';
import { TransactableEnum } from '../src/domains/transactions/dto/transactable.enum';
import { Transaction } from '../src/domains/transactions/entities/transaction.entity';

export class Fixture {
  readonly userCollection: Collection;
  readonly propertyCollection: Collection;
  readonly rentCollection: Collection;
  readonly transactionCollection: Collection;

  readonly password = '12345';

  constructor(
    private connection: Connection,
    private redisCacheService: RedisCacheService,
    private configService: ConfigService
  ){
    this.userCollection = this.connection.collection('users');
    this.propertyCollection = this.connection.collection('properties');
    this.rentCollection = this.connection.collection('rents');
    this.transactionCollection = this.connection.collection('transactions');
  }

  async createUser(data: Partial<User> = {}){
    const id = uuidv4();
    const createdAt = new Date();
    const updatedAt = new Date();

    await this.userCollection.insertOne({ ...createUserStub, ...data, _id: id as any, createdAt, updatedAt, hidden: false });
    const user = await this.userCollection.findOne({ _id: id });

    return user;
  }

  async requestPassword(email: string) {
    const key = `${RedisCacheKeys.AUTH_PASS}:${email}`;
    await this.redisCacheService.set(key, this.password, 5 * 60);

    const code = await this.redisCacheService.get(`${RedisCacheKeys.AUTH_PASS}:${email}`);
  }

  async login(user: { _id: string, email: string}) {
    await this.requestPassword(user.email);
    const token = sign(user._id, this.configService.get('SECRET'));
    return token;
  }

  async createProperty(user: User, data: Partial<Property> = {}){
    const id = uuidv4();
    const createdAt = new Date();
    const updatedAt = new Date();

    await this.propertyCollection.insertOne({ ...createPropertyStub, ...data, _id: id as any, createdAt, updatedAt, hidden: false, owner: user._id });
    const property = await this.propertyCollection.findOne({ _id: id });

    return property;
  }

  async requestRent(user: User, property?: Property){
    const id = uuidv4();
    const createdAt = new Date();
    const updatedAt = new Date();

    const propertyId = property ? property._id : (await this.createProperty(user))._id;

    await this.rentCollection.insertOne({ 
      _id: id as any, 
      createdAt, 
      updatedAt,
      occupant: user._id, 
      property: propertyId, 
      status: RentState.REQUEST, 
      duration: 1
    });
    const rent = await this.rentCollection.findOne({ _id: id });

    return rent;
  }

  async createTransaction(user: User, data: Partial<Transaction> = {}) {
    const id = uuidv4();
    const createdAt = new Date();
    const updatedAt = new Date();

    const rent = await this.requestRent(user);
    await this.transactionCollection.insertOne({ ...createTransactionStub(rent._id.toString(), TransactableEnum.RENT), ...data, _id: id as any, createdAt, updatedAt, hidden: false, owner: user._id });

    const transaction = await this.transactionCollection.findOne({ _id: id });
    return transaction;
  }
}