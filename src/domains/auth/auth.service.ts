import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { decode, sign } from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../../mail/mail.service';
import { RedisCacheKeys } from '../../redis-cache/redis-cache.keys';
import { RedisCacheService } from '../../redis-cache/redis-cache.service';
import { AuthSchema } from './entities/auth.schema';
import { LoginResponse } from './responses/login.response';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from '../users/entities/user.entity';
import { Model } from 'mongoose';
import { MailTemplateEnum } from '../../mail/mail-template.enum';


@Injectable()
export class AuthService {

  async findByEmail(email: string) {
    let user = await this.redisCacheService.get(`${RedisCacheKeys.GET_USER}:${email}`);
    if (user) {
      return user;
    }
    user = await this.userModel.findOne({ email, hidden: false }) as User;
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return User.toResponse(user);
  }

  constructor(
    @InjectModel(User.name) public readonly userModel: Model<UserDocument>,
    private readonly redisCacheService: RedisCacheService,
    private readonly mailService: MailService,
    private configService: ConfigService,
  ){}

  async requestPassword(email: string) {    
    const user = await this.findByEmail(email);
    const password = Math.floor(Math.random() * 100000);    

    const key = `${RedisCacheKeys.AUTH_PASS}:${user.email}`;
    await this.redisCacheService.set(key, password, 5 * 60);

    await this.mailService.sendMail({
      to: user.email,
      subject: 'OTP Request',
      template: MailTemplateEnum.OTP,
      context: {
        password,
        name: user.firstname
      }
    });
    
    return { success: true, message: 'Your OTP has been sent to your mail' };
  }

  async login(auth: AuthSchema){
    const user = await this.findByEmail(auth.email);
    await this.authenticate(auth);
    const authorization = sign(user._id, this.configService.get('SECRET'));
    
    return { success: true, payload: authorization } as LoginResponse;
  }

  async authenticate(auth: AuthSchema){
    const code = await this.redisCacheService.get<string>(`${RedisCacheKeys.AUTH_PASS}:${auth.email}`);   
    
    if(code?.toString() !== auth.password){
      throw new HttpException('Wrong password, please try again', HttpStatus.UNAUTHORIZED);
    }
  }

  async decode(authorization: string){    
    const id = decode(authorization, this.configService.get('SECRET')) as unknown as string;
    if (!id) throw new HttpException('Invalid authorization', HttpStatus.UNAUTHORIZED);
        
    const user = await this.userModel.findById(id);
    return user;
  }

  async verifyUser(code: string) {
    const key = `${RedisCacheKeys.VERIFY_USER}:${code}`;
    let data = await this.redisCacheService.get(key);
    if (!data) throw new HttpException('Verification link has expired', HttpStatus.EXPECTATION_FAILED);

    await this.redisCacheService.del(key);
    const user = await this.userModel.findById(data._id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.userModel.findOneAndUpdate({ _id: data._id }, { verified: true, email: data.email });

    return { success: true };
  }
}
