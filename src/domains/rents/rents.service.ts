import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RentState } from '../../shared/rent.state';
import { MailService } from '../../mail/mail.service';
import { Storage } from '../../shared/storage';
import { PropertiesService } from '../properties/properties.service';
import { CreateRentDto } from './dto/create-rent.dto';
import { Rent, RentDocument } from './entities/rent.entity';
import { RentResponse } from './responses/rent.response';
import { SortEnum } from '../../shared/sort.enum';
import { ListRentsResponse } from './responses/list-rents.response';
import { TransactionsService } from '../transactions/transactions.service';
import { CreateTransactionDto } from '../transactions/dto/create-transaction.dto';
import { TransactableEnum } from '../transactions/dto/transactable.enum';
import { UsersService } from '../users/users.service';
import { addDays, differenceInDays, differenceInHours } from 'date-fns';
import { MailTemplateEnum } from '../../mail/mail-template.enum';
import { RedisCacheService } from '../../redis-cache/redis-cache.service';

@Injectable()
export class RentsService {
  storage = new Storage();

  constructor(
    @InjectModel(Rent.name) private readonly rentModel: Model<RentDocument>,
    private readonly usersService: UsersService,
    private readonly propertiesService: PropertiesService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly redisCacheService: RedisCacheService,
    private readonly transactionService: TransactionsService
  ){}

  async requestRent(createRentDto: CreateRentDto, occupant: string) {
    const property = await this.propertiesService.getProperty(createRentDto.property);    
    if (!property.payload.active) {
      throw new BadRequestException('This property is not active at the moment');
    }

    const paid = await this.rentModel.findOne({ property: createRentDto.property, status: RentState.PAID });
    if (paid) {
      throw new ConflictException('This property has already been rented');
    }

    const exists = await this.rentModel.findOne({ property: createRentDto.property, occupant, status: RentState.REQUEST });
    if (exists) {
      throw new ConflictException('You have an open rent request on this property');
    }
    
    const model = await this.rentModel.create({ ...createRentDto, occupant });
    const rent = await model.save();
    return { success: true, payload: rent } as RentResponse;
  }

  async listRents(
    limit = this.configService.get<number>('PAGE_LIMIT'),
    offset = 0,
    sort = SortEnum.desc,
    occupant?: string,
    property?: string
  ) {
    const query: any = {};
    if (occupant) {
      query.occupant = occupant;
    }

    if (property) {
      query.property = property;
    }

    const rents = await this.rentModel.find(query)
      .sort({ 'createdAt': sort })
      .limit(limit)
      .skip(offset * limit);
      
    return { success: true, payload: rents.map(rent => Rent.toResponse(rent)) } as ListRentsResponse;
  }

  async getRent(
    id: string,
    _session?: any
  ) {
    const session = _session ? _session : await this.rentModel.startSession();
    const rent = await this.rentModel.findById(id).session(session);
    if(!rent){
      throw new NotFoundException('Rent not found');
    }

    !_session && session.endSession();
    return { success: true, payload: Rent.toResponse(rent) } as RentResponse;
  }

  async approveRent(id: string, user: string){
    const session = await this.rentModel.startSession();
    const rent = await this.getRent(id, session);
    const property = await this.propertiesService.getProperty(rent.payload.property);
    if (property.payload.owner !== user) {
      throw new UnauthorizedException('You are not authorized to approve your rent request');
    }

    const paying = await this.rentModel.findOne({ property: rent.payload.property, status: RentState.PAYING });
    if (paying) {
      throw new BadRequestException('An approved request has initiated payment, you can not approve another request at the moment');
    }

    if (![RentState.REJECTED, RentState.REQUEST].includes(rent.payload.status)) {
      throw new BadRequestException('Only rents at (request or rejected) state can be approved');
    }

    await this.rentModel.findOneAndUpdate({ _id: id }, { status: RentState.APPROVED }).session(session);
    await session.endSession();
    return { success: true, payload: { ...rent.payload, status: RentState.APPROVED } } as RentResponse;
  }

  async rejectRent(id: string, user: string){
    const session = await this.rentModel.startSession();
    const rent = await this.getRent(id, session);
    const property = await this.propertiesService.getProperty(rent.payload.property);
    if (property.payload.owner !== user) {
      throw new UnauthorizedException('You are not authorized to reject your rent request');
    }

    if (rent.payload.status === RentState.PAYING) {
      throw new BadRequestException('The rent is currently on a paying state, you can not reject it');
    }

    if (![RentState.APPROVED, RentState.REQUEST].includes(rent.payload.status)) {
      throw new BadRequestException('Only rents at (request or approved) state can be rejected');
    }

    await this.rentModel.findOneAndUpdate({ _id: id }, { status: RentState.REJECTED }).session(session);
    await session.endSession();
    return { success: true, payload: { ...rent.payload, status: RentState.REJECTED } } as RentResponse;
  }

  async payingRent(id: string, user: string){
    const session = await this.rentModel.startSession();
    const rent = await this.getRent(id, session);
    if (rent.payload.occupant !== user) {
      throw new UnauthorizedException('You are not authorized to pay for this rent, it does not belong to you');
    }

    const paying = await this.rentModel.findOne({ property: rent.payload.property, status: RentState.PAYING });
    if (paying && user === paying.get('occupant')) {
      throw new BadRequestException('You have already initiated payment for this rent');
    }

    if (paying) {
      throw new BadRequestException('A payment request has initiated on this rent, you can not pay for it at the moment');
    }

    if (rent.payload.status !== RentState.APPROVED) {
      throw new BadRequestException('You can only pay for rents that are in approved state');
    }

    await this.rentModel.findOneAndUpdate({ _id: id }, { status: RentState.PAYING }).session(session);
    await session.endSession();
    return { success: true, payload: { ...rent.payload, status: RentState.PAYING } } as RentResponse;
  }

  async payRent(
    id: string,
    user: string,
    createTransactionDto: CreateTransactionDto
  ){
    const session = await this.rentModel.startSession();
    const rent = await this.getRent(id, session);
    if (
      createTransactionDto.transactable !== TransactableEnum.RENT
      || id !== createTransactionDto.item
    ) {
      throw new BadRequestException('Transaction mismatch: Transaction not meant for this rent');
    }

    if (rent.payload.occupant !== user) {
      throw new UnauthorizedException('You are not authorized to pay for this rent, it does not belong to you');
    }

    if (![RentState.PAYING].includes(rent.payload.status)) {
      throw new BadRequestException('Only rents at (paying) state can be paid');
    }

    await this.transactionService.createTransaction(createTransactionDto);
    await this.rentModel.findOneAndUpdate({ _id: id }, { status: RentState.PAID }).session(session);
    await session.endSession();
    return { success: true, payload: { ...rent.payload, status: RentState.PAID } } as RentResponse;
  }

  async cancelRent(
    id: string,
    user: string
  ){
    const session = await this.rentModel.startSession();
    const rent = await this.getRent(id);
    if (rent.payload.occupant !== user) {
      throw new UnauthorizedException('You are not authorized to cancel for this rent, it does not belong to you');
    }

    if (![RentState.APPROVED, RentState.REQUEST].includes(rent.payload.status)) {
      throw new BadRequestException('Only rents at (request or approved) state can be canceled');
    }

    await this.rentModel.findOneAndUpdate({ _id: id }, { status: RentState.CANCELED }).session(session);
    await session.endSession();
    return { success: true, payload: { ...rent.payload, status: RentState.CANCELED } } as RentResponse;
  }

  async cancelRentPayment(
    id: string,
    user: string
  ){
    const session = await this.rentModel.startSession();
    const rent = await this.getRent(id);
    if (rent.payload.occupant !== user) {
      throw new UnauthorizedException('You are not authorized to cancel payment for this rent, it does not belong to you');
    }

    if (![RentState.PAYING].includes(rent.payload.status)) {
      throw new BadRequestException('Only rents at (paying) state can have the payment cancelled');
    }

    await this.rentModel.findOneAndUpdate({ _id: id }, { status: RentState.APPROVED }).session(session);
    await session.endSession();
    return { success: true, payload: { ...rent.payload, status: RentState.APPROVED } } as RentResponse;
  }

  async remindRentsJob(){
    const session = this.rentModel.startSession();
    const rents = await this.rentModel.find({ status: RentState.PAID });
    await Promise.all(rents.map((rent: any) => this.remindRent(rent, session)));
    await (await session).endSession();
  }

  async remindRent(rent: Rent, _session?: any){
    const session = _session ? _session : await this.rentModel.startSession();
    const transactions = await this.transactionService.listTransactions(undefined, undefined, undefined, { 
      transactable: TransactableEnum.RENT, 
      item: rent._id.toString()
    });      

    const transaction = transactions.payload[0];   
    const createdAt = new Date(transaction.createdAt);
    const expiresAt = addDays(createdAt, rent.duration);
    const daysLeft = differenceInDays(expiresAt, new Date());
    const hoursLeft = differenceInHours(expiresAt, new Date());
  
    const user = await this.usersService.getUser(rent.occupant);
    const property = await this.propertiesService.getProperty(rent.property);

    if (daysLeft == 0 && hoursLeft == 0){
      await this.rentModel.findOneAndUpdate({ _id: rent._id }, { status: RentState.EXPIRED }).session(session);
      await this.mailService.sendMail({
        to: user.payload.email,
        subject: 'Rent Reminder',
        template: MailTemplateEnum.RENT_REMINDER,
        context: {
          url: 'https://occupyapi.herokuapp.com/verify',
          name: user.payload.firstname,
          daysLeft,
          property: property.payload.title
        }
      });
    }
    else if (daysLeft == 0 && hoursLeft <= 1){
      
    }
    else if(daysLeft == 1){
      await this.mailService.sendMail({
        to: user.payload.email,
        subject: 'Rent Reminder',
        template: MailTemplateEnum.RENT_REMINDER,
        context: {
          url: 'https://occupyapi.herokuapp.com/verify',
          name: user.payload.firstname,
          daysLeft,
          property: property.payload.title
        }
      });
    }

    !_session && session.endSession();
    return { daysLeft, hoursLeft };
  }
}
