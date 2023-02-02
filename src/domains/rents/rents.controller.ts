import { Controller, Get, Post, Body, Patch, Param, HttpStatus, UsePipes, UseGuards, Query } from '@nestjs/common';
import { RentsService } from './rents.service';
import { CreateRentDto } from './dto/create-rent.dto';
import { UpdateRentDto } from './dto/update-rent.dto';
import { ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ErrorResponse } from '../../errors/error.response';
import { RentResponse } from './responses/rent.response';
import { JoiValidationPipe } from '../../pipes/joi-validation.pipe';
import { CreateRentValidator } from './validators/create-rent.validator';
import { CurrentUser } from '../../decorators/currentUser.decorator';
import { AuthorizeGuard } from '../../guards/authorize.guard';
import { ListRentsResponse } from './responses/list-rents.response';
import * as Joi from 'joi';
import { SortEnum } from '../../shared/sort.enum';
import { IdValidator } from '../../shared/id.validator';
import { UpdateRentValidator } from './validators/update-rent.validator';
import { CreateTransactionValidator } from '../transactions/validators/create-transaction.validator';
import { CreateTransactionDto } from '../transactions/dto/create-transaction.dto';

@Controller('rents')
export class RentsController {
  constructor(
    private readonly rentsService: RentsService,
  ) {}

  @ApiResponse({ status: HttpStatus.CREATED, type: RentResponse})
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, type: ErrorResponse })
  @ApiResponse({ status: HttpStatus.CONFLICT, type: ErrorResponse })
  @UseGuards(AuthorizeGuard)
  @Post()
  requesRent(
    @Body(new JoiValidationPipe(CreateRentValidator)) createRentDto: CreateRentDto,
    @CurrentUser('_id') occupant: string
  ) {    
    return this.rentsService.requestRent(createRentDto, occupant);
  }

  @ApiQuery({ name: 'limit', required: false, description: 'The max number of rents to fetch', type: Number })
  @ApiQuery({ name: 'offset', required: false, description: 'The page number to fetch', type: Number })
  @ApiQuery({ name: 'sort', required: false, description: 'The order of sorting', enum: SortEnum, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: ListRentsResponse})
  @Get()
  listRents(
    @Query('limit', new JoiValidationPipe(Joi.number().min(1))) limit?: number,
    @Query('offset', new JoiValidationPipe(Joi.number().min(0))) offset?: number,
    @Query('sort', new JoiValidationPipe(Joi.string().valid(...Object.values(SortEnum)))) sort?: SortEnum,
    @Query('occupant', new JoiValidationPipe(Joi.string())) occupant?: string,
    @Query('property', new JoiValidationPipe(Joi.string())) property?: string,
  ) {
    return this.rentsService.listRents(limit, offset, sort, occupant, property);
  }

  @ApiResponse({ status: HttpStatus.OK, type: RentResponse})
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ErrorResponse})
  @Get(':id')
  getRent(
    @Param('id', new JoiValidationPipe(IdValidator())) id: string
  ) {
    return this.rentsService.getRent(id);
  }

  @ApiResponse({ status: HttpStatus.OK, type: RentResponse})
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ErrorResponse})
  @UseGuards(AuthorizeGuard)
  @Patch(':id/approve')
  approveRent(
    @Param('id', new JoiValidationPipe(IdValidator())) id: string, 
    @CurrentUser('_id') user: string
  ) {
    return this.rentsService.approveRent(id, user);
  }  

  @ApiResponse({ status: HttpStatus.OK, type: RentResponse})
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ErrorResponse})
  @UseGuards(AuthorizeGuard)
  @Patch(':id/reject')
  rejectRent(
    @Param('id', new JoiValidationPipe(IdValidator())) id: string, 
    @CurrentUser('_id') user: string
  ) {
    return this.rentsService.rejectRent(id, user);
  }  

  @ApiResponse({ status: HttpStatus.OK, type: RentResponse})
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ErrorResponse})
  @UseGuards(AuthorizeGuard)
  @Patch(':id/paying')
  payingRent(
    @Param('id', new JoiValidationPipe(IdValidator())) id: string, 
    @CurrentUser('_id') user: string
  ) {
    return this.rentsService.payingRent(id, user);
  } 

  @ApiResponse({ status: HttpStatus.OK, type: RentResponse})
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ErrorResponse})
  @UseGuards(AuthorizeGuard)
  @Patch(':id/cancel')
  cancelRent(
    @Param('id', new JoiValidationPipe(IdValidator())) id: string, 
    @CurrentUser('_id') user: string
  ) {
    return this.rentsService.cancelRent(id, user);
  } 

  @ApiResponse({ status: HttpStatus.OK, type: RentResponse})
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ErrorResponse})
  @UseGuards(AuthorizeGuard)
  @Patch(':id/cancel-rent-payment')
  cancelRentPayment(
    @Param('id', new JoiValidationPipe(IdValidator())) id: string, 
    @CurrentUser('_id') user: string
  ) {
    return this.rentsService.cancelRentPayment(id, user);
  } 

  @ApiResponse({ status: HttpStatus.OK, type: RentResponse})
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ErrorResponse})
  @UseGuards(AuthorizeGuard)
  @Patch(':id/pay')
  payRent(
    @Param('id', new JoiValidationPipe(IdValidator())) id: string, 
    @Body(new JoiValidationPipe(CreateTransactionValidator)) createTransactionDto: CreateTransactionDto,
    @CurrentUser('_id') user: string
  ) {
    return this.rentsService.payRent(id, user, createTransactionDto);
  }  
}
