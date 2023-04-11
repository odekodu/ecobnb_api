import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PropertiesModule } from './properties/properties.module';
import { RentsModule } from './rents/rents.module';
import { TransactionsModule } from './transactions/transactions.module';
import { ProfilesModule } from './profiles/profiles.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    UsersModule,
    AuthModule,
    ProfilesModule,
    PropertiesModule,
    RentsModule,
    TransactionsModule,
    NotificationsModule
  ]
})
export class DomainsModule {}
