import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";
import { v4 as uuidv4 } from 'uuid';
import { NotificationTemplateEnum } from "../notification-template.enum";

@Schema({ timestamps: true, versionKey: false })
export class Notification {
    
    @ApiProperty({ description: 'The notification id' })
    @Prop({ type: String, default: uuidv4 })
    _id?: string;

    @ApiProperty({ description: 'The user id' })
    @Prop({ required: [true, 'userId is required'] })
    userId: string;

    @ApiProperty({ description: 'The notification subject' })
    @Prop({ required: [true, 'subject is required'] })
    subject: string;

    @ApiProperty({ description: 'The notification template' })
    @Prop({ type: String, required: [true, 'template is required'] })
    template: NotificationTemplateEnum;

    @ApiProperty({ description: 'The notification data' })
    @Prop({ type: {}, required: [true, 'data is required'] })
    data: any;

    createdAt: Date;

    updatedAt: Date;

    static toResponse(data: any) {
        const notification = data._doc;
        delete notification.hidden;

        return notification as Notification;
    }
}

export type NotificationDocument = Notification | Document;
export const NotificationSchema = SchemaFactory.createForClass(Notification);