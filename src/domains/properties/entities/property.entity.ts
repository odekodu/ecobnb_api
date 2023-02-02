import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { User } from "../../users/entities/user.entity";
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true, versionKey: false })
export class Property {
  @Prop({ type: String, default: function getId(){
    return uuidv4();
  }})
  _id?: string;

  @Prop({ ref: User.name, required: [true, '"owner" is required'] })
  owner: string;

  @Prop({ required: [true, '"title" is required'] })
  title: string;

  @Prop({ required: [true, '"country" is required'] })
  country: string;

  @Prop({ required: [true, '"state" is required'] })
  state: string;

  @Prop({ required: [true, '"city" is required'] })
  city: string;

  @Prop({ required: [true, '"address" is required'] })
  address: string;

  @Prop({ required: [true, '"prices" is required'] })
  price: number;

  @Prop({ default: false })
  active: boolean;

  @Prop()
  description: string;

  @Prop({ default: false })
  hidden?: boolean;

  @Prop({ type: [String], default: [] })
  images: string[];

  createdAt: Date;

  updatedAt: Date;

  static toResponse(data: any){
    const property = data._doc;
    delete property.hidden;
    
    return property;
  }
}

export type PropertyDocument = Property | Document;
export const PropertySchema = SchemaFactory.createForClass(Property);