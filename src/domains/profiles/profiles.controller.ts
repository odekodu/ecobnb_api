import { Body, CacheKey, Controller, Delete, Get, HttpStatus, Patch, Put, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiResponse } from '@nestjs/swagger';
import { JoiValidationPipe } from '../../pipes/joi-validation.pipe';
import { CurrentUser } from '../../decorators/currentUser.decorator';
import { ErrorResponse } from '../../errors/error.response';
import { AuthenticationGuard } from '../../guards/authentication.guard';
import { AuthorizeGuard } from '../../guards/authorize.guard';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { UsersService } from '../users/users.service';
import { UpdateProfileValidator } from './validators/update-profile.validator';
import { UserResponse } from '../users/responses/user.response';
import { CacheClear } from '../../decorators/cache-clear.decorator';
import { RedisCacheKeys } from '../../redis-cache/redis-cache.keys';
import { CacheFilter } from '../../decorators/cache-filter.decorator';
import { SuccessResponse } from '../../shared/success.response';


@Controller('profile')
export class ProfilesController {
  constructor(
    private readonly usersService: UsersService
  ) {}

  @ApiHeader({ name: 'authorization', required: true })
  @ApiResponse({ status: HttpStatus.OK, type: UserResponse })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ErrorResponse })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, type: ErrorResponse })
  @UseGuards(AuthorizeGuard)
  @CacheKey(RedisCacheKeys.GET_USER)
  @CacheFilter('token')
  @Get()
  getProfile(
    @CurrentUser('_id') id: string
  ) {
    return this.usersService.getUser(id);
  }

  @ApiHeader({ name: 'authorization', required: true })
  @ApiHeader({ name: 'password', required: true })
  @ApiResponse({ status: HttpStatus.OK, type: UserResponse })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ErrorResponse })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, type: ErrorResponse })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, type: ErrorResponse })
  @UseGuards(AuthorizeGuard, AuthenticationGuard)
  @CacheClear(RedisCacheKeys.LIST_USERS, RedisCacheKeys.GET_USER)
  @Patch()
  updateProfile(
    @Body(new JoiValidationPipe(UpdateProfileValidator)) updateUserDto: UpdateUserDto,
    @CurrentUser('_id') id: string
  ) {    
    return this.usersService.updateUser(id, updateUserDto);
  }

  @ApiHeader({ name: 'authorization', required: true })
  @ApiHeader({ name: 'password', required: true })
  @ApiResponse({ status: HttpStatus.OK, type: SuccessResponse })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ErrorResponse })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, type: ErrorResponse })
  @UseGuards(AuthorizeGuard, AuthenticationGuard)
  @CacheClear(RedisCacheKeys.LIST_USERS, RedisCacheKeys.GET_USER)
  @Delete()
  removeProfie(
    @CurrentUser('_id') id: string,
  ){
    return this.usersService.removeUser(id);
  }
}
