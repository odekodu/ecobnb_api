import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Property } from "../../properties/entities/property.entity";
import { User } from '../../users/entities/user.entity';
import { RentState } from '../../../shared/rent.state';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true, versionKey: false })
export class Rent {

  @Prop({ type: String, default: function getId(){
    return uuidv4();
  }})
  _id?: string;

  @Prop({ ref: Property.name, required: [true, '"property" is required'] })
  property: string;

  @Prop({ ref: User.name, required: [true, '"occupant" is required'] })
  occupant: string;

  @Prop({ required: [true, '"duration" is required']  })
  duration: number;

  @Prop({ type: String, default: RentState.REQUEST })
  status: RentState;

  createdAt: Date;

  updatedAt: Date;

  static toResponse(data: any){
    const rent = data._doc;
    
    return rent;
  }
}

export type RentDocument = Rent | Document;
export const RentSchema = SchemaFactory.createForClass(Rent);