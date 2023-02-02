import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { PropertiesModule } from './properties/properties.module';
import { RentsModule } from './rents/rents.module';
import { TransactionsModule } from './transactions/transactions.module';

@Module({
  imports: [
    UsersModule,
    AuthModule,
    ProfileModule,
    PropertiesModule,
    RentsModule,
    TransactionsModule
  ]
})
export class DomainsModule {}
