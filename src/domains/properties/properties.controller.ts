import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpStatus, CacheKey, Query, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { ApiHeader, ApiQuery, ApiResponse, PickType } from '@nestjs/swagger';
import { AuthorizeGuard } from '../../guards/authorize.guard';
import { ErrorResponse } from '../../errors/error.response';
import { CurrentUser } from '../../decorators/currentUser.decorator';
import { PropertyResponse } from './responses/property.response';
import { JoiValidationPipe } from '../../pipes/joi-validation.pipe';
import { CreatePropertyValidator } from './validators/create-property.validator';
import { IdValidator } from '../../shared/id.validator';
import { ListPropertiesResponse } from './responses/list-properties.response';
import { RedisCacheKeys } from '../../redis-cache/redis-cache.keys';
import { SortEnum } from '../../shared/sort.enum';
import * as Joi from 'joi';
import { ResponseSchema } from '../../shared/response.schema';
import { UpdatePropertyValidator } from './validators/update-property.validator';
import { Storage } from '../../shared/storage';
import { FileValidator } from '../../shared/file.validator';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @ApiHeader({ name: 'token', required: true }) 
  @ApiResponse({ status: HttpStatus.CREATED, type: PropertyResponse })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, type: ErrorResponse })
  @UseGuards(AuthorizeGuard)
  @Post()
  createProperty(
    @Body(new JoiValidationPipe(CreatePropertyValidator)) createPropertyDto: CreatePropertyDto,
    @CurrentUser('_id') owner: string
  ) {
    return this.propertiesService.createProperty(createPropertyDto, owner);
  }

  @ApiQuery({ name: 'limit', required: false, description: 'The max number of properties to fetch', type: Number })
  @ApiQuery({ name: 'offset', required: false, description: 'The page number to fetch', type: Number })
  @ApiQuery({ name: 'sort', required: false, description: 'The order of sorting', enum: SortEnum, type: String })
  @ApiQuery({ name: 'query', required: false, description: 'The query for searching properties', type: String })
  @CacheKey(RedisCacheKeys.LIST_PROPERTIES)
  @ApiResponse({ status: HttpStatus.OK, type: ListPropertiesResponse })
  @Get()
  listProperties(
    @Query('limit', new JoiValidationPipe(Joi.number().min(1))) limit?: number,
    @Query('offset', new JoiValidationPipe(Joi.number().min(0))) offset?: number,
    @Query('sort', new JoiValidationPipe(Joi.string().valid(...Object.values(SortEnum)))) sort?: SortEnum,
    @Query('query', new JoiValidationPipe(Joi.string().default(''))) query?: string
  ) {
    return this.propertiesService.listProperties(limit, offset, sort, query);
  }

  @ApiResponse({ status: HttpStatus.OK, type: PropertyResponse })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ErrorResponse })
  @CacheKey(RedisCacheKeys.GET_PROPERTY)
  @Get(':id')
  getProperty(
    @Param('id', new JoiValidationPipe(IdValidator())) id: string
  ) {
    return this.propertiesService.getProperty(id);
  }

  @ApiHeader({ name: 'token', required: true })
  @ApiResponse({ status: HttpStatus.OK, type: PropertyResponse })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ErrorResponse })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, type: ErrorResponse })
  @UseGuards(AuthorizeGuard)
  @Patch(':id')
  updateProperty(
    @Param('id', new JoiValidationPipe(IdValidator())) id: string,
    @Body(new JoiValidationPipe(UpdatePropertyValidator)) updatePropertyDto: UpdatePropertyDto,
    @CurrentUser('_id') owner: string
  ) {
    return this.propertiesService.updateProperty(id, updatePropertyDto, owner);
  }

  @ApiHeader({ name: 'token', required: true })
  @ApiHeader({ name: 'password', required: true })
  @ApiResponse({ status: HttpStatus.OK, type: PickType(ResponseSchema, ['success']) })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ErrorResponse })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, type: ErrorResponse })
  @UseGuards(AuthorizeGuard)
  @Delete(':id')
  removeProperty(
    @Param('id', new JoiValidationPipe(IdValidator())) id: string,
    @CurrentUser('_id') owner: string
  ) {
    return this.propertiesService.removeProperty(id, owner);
  }

  @ApiHeader({ name: 'token', required: true })
  @ApiResponse({ status: HttpStatus.OK, type: PropertyResponse })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ErrorResponse })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, type: ErrorResponse })
  @UseGuards(AuthorizeGuard)
  @UseInterceptors(Storage.upload('images', 10))
  @Patch(':id/images')
  updatePropertyImages(
    @Param('id', new JoiValidationPipe(IdValidator())) id: string,
    @UploadedFiles(new JoiValidationPipe(FileValidator.Many)) files: any[],
    @CurrentUser('_id') owner: string
  ) {
    return this.propertiesService.updatePropertyImages(id, files, owner);
  }
}
