import { Controller, Get, Param, UseGuards, HttpStatus, CacheKey, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ApiHeader, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { AuthorizeGuard } from '../../guards/authorize.guard';
import { ErrorResponse } from '../../errors/error.response';
import { RedisCacheKeys } from '../../redis-cache/redis-cache.keys';
import { NotificationResponse } from './responses/notification.response';
import { JoiValidationPipe } from '../../pipes/joi-validation.pipe';
import { IdValidator } from '../../shared/id.validator';
import { SortEnum } from '../../shared/sort.enum';
import { ListNotificationsResponse } from './responses/list-notifications.response';
import { ListNotificationsValidator } from './validators/list-notifications.validator';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiHeader({ name: 'authorization', required: true })
  @UseGuards(AuthorizeGuard)
  @ApiQuery({ name: 'limit', required: false, description: 'The max number of users to fetch', type: Number })
  @ApiQuery({ name: 'offset', required: false, description: 'The page number to fetch', type: Number })
  @ApiQuery({ name: 'sort', required: false, description: 'The order of sorting', enum: SortEnum, type: String })
  @ApiQuery({ name: 'query', required: false, description: 'The query for searching users', type: String })
  @ApiResponse({ status: HttpStatus.OK, type: ListNotificationsResponse })
  @CacheKey(RedisCacheKeys.LIST_NOTIFICATIONS)
  @Get()
  listNotifications(
    @Query(new JoiValidationPipe(ListNotificationsValidator)) { limit, offset, sort, minDate, maxDate }: any
  ) {
    return this.notificationsService.listNotifications(limit, offset, sort, minDate, maxDate);
  }

  @ApiHeader({ name: 'authorization', required: true })
  @UseGuards(AuthorizeGuard)
  @ApiParam({ name: 'id', required: true, description: 'The id of the notification' })
  @ApiResponse({ status: HttpStatus.OK, type: NotificationResponse })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ErrorResponse })
  @CacheKey(RedisCacheKeys.GET_NOTIFICATION)
  @Get(':id')
  getNotification(
    @Param('id', new JoiValidationPipe(IdValidator())) id: string
  ) {
    return this.notificationsService.getNotification(id);
  }
}
