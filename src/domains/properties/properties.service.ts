import { NotFoundException, Injectable, UnauthorizedException, Scope, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { REQUEST } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Request } from 'express';
import { Model } from 'mongoose';
import { Storage } from '../../shared/storage';
import { RedisCacheKeys } from '../../redis-cache/redis-cache.keys';
import { RedisCacheService } from '../../redis-cache/redis-cache.service';
import { SortEnum } from '../../shared/sort.enum';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { Property, PropertyDocument } from './entities/property.entity';
import { ListPropertiesResponse } from './responses/list-properties.response';
import { PropertyResponse } from './responses/property.response';

@Injectable(
  { scope: Scope.REQUEST }
)
export class PropertiesService {

  storage = new Storage();

  constructor(
    @InjectModel(Property.name) private readonly propertyModel: Model<PropertyDocument>,
    @Inject(REQUEST) private readonly request: Request,
    private readonly configService: ConfigService,
    private readonly redisCacheService: RedisCacheService,
  ){}

  async createProperty(
    createPropertyDto: CreatePropertyDto,
    owner: string
  ) {
    const model = await this.propertyModel.create({ ...createPropertyDto, owner });
    return this.getProperty(model.get('_id'));
  }

  async listProperties(
    limit = this.configService.get<number>('PAGE_LIMIT'),
    offset = 0,
    sort = SortEnum.desc,
    query = ''
  ) {
    const properties = await this.propertyModel.find({
      hidden: false,
      $or: [
        { title: new RegExp(query, 'i') },
        { description: new RegExp(query, 'i') },
        { address: new RegExp(query, 'i') },
        { country: new RegExp(query, 'i') },
        { state: new RegExp(query, 'i') },
        { city: new RegExp(query, 'i') }
      ]
    })
      .sort({ 'createdAt': sort })
      .limit(limit)
      .skip(offset * limit);
      
      return { success: true, payload: properties.map(property => Property.toResponse(property))} as ListPropertiesResponse;
  }

  async getProperty(
    id: string
  ) {
    const property = await this.propertyModel.findById(id);
    if(!property){
      throw new NotFoundException('Property not found');
    }

    return { success: true, payload: Property.toResponse(property) } as PropertyResponse;
  }

  async updateProperty(
    id: string, 
    updatePropertyDto: UpdatePropertyDto, 
    owner: string
  ) {
    const property = await this.getProperty(id);    
    if (owner !== property.payload.owner) {
      throw new UnauthorizedException('You are not authorized');
    }

    await this.propertyModel.findOneAndUpdate({ _id: id }, updatePropertyDto);

    await this.redisCacheService.del(`${RedisCacheKeys.GET_PROPERTY}-${this.request.url}`);
    await this.redisCacheService.del(`${RedisCacheKeys.LIST_PROPERTIES}`, true);

    return { success: true, payload: { ...property.payload, ...updatePropertyDto} } as PropertyResponse;
  }

  async removeProperty(id: string, owner: string) {
    const property = await this.getProperty(id);    
    if (owner !== property.payload.owner) {
      throw new UnauthorizedException('You are not authorized');
    }

    await this.propertyModel.findOneAndUpdate({ _id: id }, { hidden: true });

    await this.redisCacheService.del(`${RedisCacheKeys.GET_PROPERTY}-${this.request.url}`);
    await this.redisCacheService.del(`${RedisCacheKeys.LIST_PROPERTIES}`, true);

    return { success: true };
  }

  async updatePropertyImages(
    id: string, 
    files: any[], 
    owner: string
  ){    
    await this.getProperty(id);
    const images = await Promise.all(files.map(async (file) => {
      const temp = [file.destination, file.filename].join('/');    
      return await this.storage.move(temp, [owner, 'properties', id].join('/'), file.filename);
    }));

    const property = await this.propertyModel.findOneAndUpdate({ _id: id }, {
      $set: { images }
    });

    return { success: true, payload: [...property.get('images'), ...images] };
  }
}
