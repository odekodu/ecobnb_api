import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateNotificationDto } from './dto/create-notification.dto';
import * as Handlebars from 'handlebars';
import { InjectModel } from '@nestjs/mongoose';
import { Notification, NotificationDocument } from './entities/notification.entity';
import { Model } from 'mongoose';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SortEnum } from '../../shared/sort.enum';
import { ListNotificationsResponse } from './responses/list-notifications.response';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private readonly notificationModel: Model<NotificationDocument>,
    private readonly configService: ConfigService
  ) { }

  async createNotification(
    createNotificationDto: CreateNotificationDto,
    userId: string
  ) {
    const model = await this.notificationModel.create({ ...createNotificationDto, userId });
    return Notification.toResponse(model);
  }

  async listNotifications(
    limit = this.configService.get<number>('PAGE_LIMIT'),
    offset = 0,
    sort = SortEnum.desc,
    minDate = new Date(1901),
    maxDate = new Date()
  ) {
    minDate = new Date(Number(minDate));
    maxDate = new Date(Number(maxDate));

    let query: any = {
      $and: [
        { createdAt: { '$gte': minDate, '$lte': maxDate } },
      ],
    };

    const notifications = await this.notificationModel.find(query)
      .sort({ 'createdAt': sort })
      .limit(limit)
      .skip(offset * limit);

    return { success: true, payload: notifications.map(notification => Notification.toResponse(notification)) } as ListNotificationsResponse;
  }

  async getNotification(
    id: string
  ) {
    const notification = await this.notificationModel.findById(id);
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    const path = join(__dirname, `../../templates/notifications/${notification.get('template')}`);
    const file = readFileSync(path).toString();
    const template = Handlebars.compile(file);
    const message = template(notification.get('data'));

    return { success: true, payload: Notification.toResponse(notification), message };
  }
}
