import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RedisCacheKeys } from '../../redis-cache/redis-cache.keys';
import { RedisCacheService } from '../../redis-cache/redis-cache.service';
import { MailService } from '../../mail/mail.service';
import { ResponseSchema } from '../../shared/response.schema';
import { SortEnum } from '../../shared/sort.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument } from './entities/user.entity';
import { UserResponse } from './responses/user.response';
import { v4 as uuidV4 } from 'uuid';
import { Storage } from '../../shared/storage';
import { testCheck } from '../../shared/test.check';
import { AccessRights } from '../../shared/access.right';
import { MailTemplateEnum } from '../../mail/mail-template.enum';

@Injectable()
export class UsersService {
  storage = new Storage();

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private redisCacheService: RedisCacheService,
  ) { }

  async onModuleInit() {
    await this.setAdmin();
  }

  async setAdmin() {
    if (!testCheck()) {
      const superAdmin = await this.userModel.findOne({ right: AccessRights.SUPERADMIN });

      if (!superAdmin) {
        await this.userModel.create({
          email: this.configService.get('DEFAULT_EMAIL'),
          phone: '0000000000',
          firstname: 'default',
          lastname: 'admin',
          rights: [AccessRights.SUPERADMIN],
          createdAt: new Date(),
          updatedAt: new Date(),
          hidden: false
        });
      }
    }
  }

  async findById(id: string) {
    let user = await this.redisCacheService.get<User>(`${RedisCacheKeys.GET_USER}:${id}`);
    if (user) {
      return user;
    }
    user = await this.userModel.findOne({ _id: id, hidden: false });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return User.toResponse(user);
  }

  async createUser(createUserDto: CreateUserDto) {
    const model = await this.userModel.create(createUserDto);
    const user = await this.findById(model._id as string);

    await this.sendVerification(user._id, user.email);
    return { success: true, payload: user } as UserResponse;
  }

  async listUsers(
    limit = this.configService.get<number>('PAGE_LIMIT'),
    offset = 0,
    sort = SortEnum.desc,
    query = ''
  ) {
    const users = await this.userModel.find({
      hidden: false,
      $or: [
        { email: new RegExp(query, 'i') },
        { firstname: new RegExp(query, 'i') },
        { lastname: new RegExp(query, 'i') }
      ]
    })
      .sort({ 'createdAt': sort })
      .limit(limit)
      .skip(offset * limit);

    return { success: true, payload: users.map(user => User.toResponse(user)) } as ResponseSchema<User[]>;
  }

  async getUser(id: string) {
    const user = await this.findById(id);
    return { success: true, payload: user } as UserResponse;
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.findById(id);
    await this.userModel.findOneAndUpdate({ _id: id }, updateUserDto);

    if (updateUserDto.email) {
      await this.sendVerification(user._id, updateUserDto.email);
    }

    if (updateUserDto.image) {
      updateUserDto.image = await this.storage.base64ToFile(updateUserDto.image, user._id, 'image.png');
    }

    return { success: true, payload: { ...user, ...updateUserDto } } as UserResponse;
  }

  async removeUser(id: string) {
    await this.findById(id);
    await this.userModel.findOneAndUpdate({ _id: id }, { hidden: true });

    return { success: true };
  }

  async sendVerification(_id: string, email: string) {
    const user = await this.findById(_id);
    const app = this.configService.get<string>('APP');
    const code = uuidV4();
    const aDay = 86400;

    await this.redisCacheService.set(`${RedisCacheKeys.VERIFY_USER}:${code}`, { email, _id: user._id }, aDay);
    await this.mailService.sendMail({
      to: email,
      subject: 'Registration Successful',
      template: MailTemplateEnum.VERIFY,
      context: {
        url: `${app}/verify?code=${code}`,
        name: user.firstname
      }
    });
  }
}
