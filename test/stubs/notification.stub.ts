import { CreateNotificationDto } from "../../src/domains/notifications/dto/create-notification.dto";
import { Notification } from "../../src/domains/notifications/entities/notification.entity";
import { NotificationTemplateEnum } from "../../src/domains/notifications/notification-template.enum";

export const createNotificationStub: Partial<CreateNotificationDto> = {
    subject: 'A new notification',
    template: NotificationTemplateEnum.ORDER_PLACED,
    data: {
      name: 'First User'
    }
}

export const notificationStub: Partial<Notification> = {
  ...createNotificationStub,
}

