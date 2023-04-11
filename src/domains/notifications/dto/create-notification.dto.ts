import { ApiProperty } from "@nestjs/swagger";
import { NotificationTemplateEnum } from "../notification-template.enum";

export class CreateNotificationDto {
    @ApiProperty({ description: 'The notification subject' })
    subject: string;

    @ApiProperty({ description: 'The notification template', enum: NotificationTemplateEnum })
    template: NotificationTemplateEnum;

    @ApiProperty({ description: 'The notification data' })
    data: any;
}
