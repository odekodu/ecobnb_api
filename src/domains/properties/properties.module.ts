import { Global, Module } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { PropertiesController } from './properties.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Property, PropertySchema } from './entities/property.entity';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Property.name, schema: PropertySchema}
    ])
  ],
  controllers: [PropertiesController],
  providers: [PropertiesService],
  exports: [PropertiesService]
})
export class PropertiesModule {}
