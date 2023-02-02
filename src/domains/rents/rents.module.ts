import { Global, Module } from '@nestjs/common';
import { RentsService } from './rents.service';
import { RentsController } from './rents.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Rent, RentSchema } from './entities/rent.entity';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Rent.name, schema: RentSchema}
    ])
  ],
  controllers: [RentsController],
  providers: [RentsService],
  exports: [RentsService]
})
export class RentsModule {}
