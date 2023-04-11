import { ApiProperty, PickType } from "@nestjs/swagger";
import { ResponseSchema } from "../../../shared/response.schema";
import { Notification } from "../entities/notification.entity";

export class NotificationResponse extends PickType(ResponseSchema<Notification>, ['payload', 'timestamp', 'success']){
  @ApiProperty({ description: 'The payload of the response', type: Notification })
  payload?: Notification;
}