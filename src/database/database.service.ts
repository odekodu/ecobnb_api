import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { ClientSession, Connection } from 'mongoose';
import { testCheck } from '../shared/test.check';
import { AccessRights } from '../shared/access.right';
import { v4 as uuidV4 } from 'uuid';

@Injectable()
export class DatabaseService {

  get replicated(){        
    return Number(this.configService.get('REPLICATED')) === 1;
  }

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private configService: ConfigService
  ) { }

  getConnection(): Connection {
    return this.connection;
  }

  async transaction<T>(callback: (session: ClientSession) => Promise<T>): Promise<T> {
    let result: T;    
    console.log(this.replicated)
    if (this.replicated) {
      const session = await this.connection.startSession();
      try {
        session.startTransaction();
        result = await callback(session);
        await session.commitTransaction();
      } catch (error) {
        session.abortTransaction();
        await session.endSession();
        throw error;
      }
      await session.endSession();
      return result;
    }
    

    return callback(null);
  }
}
