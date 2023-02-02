import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { v4 as uuidv4 } from 'uuid';
import { TransactableEnum } from "../dto/transactable.enum";

@Schema({ timestamps: true, versionKey: false })
export class Transaction {
  @Prop({ type: String, default: function getId(){
    return uuidv4();
  }})
  _id?: string;

  @Prop({ required: [true, '"amount" is required'] })
  from: string;

  @Prop({ required: [true, '"from" is required'] })
  amount: number;

  @Prop({ required: [true, '"to" is required'] })
  to: string;

  @Prop({ type: String, required: [true, '"transactable" is required'] })
  transactable: TransactableEnum;

  @Prop({ required: [true, '"item" is required'] })
  item: string;

  @Prop({ required: [true, '"platform" is required'] })
  platform: string;

  @Prop({ required: [true, '"reference" is required'] })
  reference: number;

  createdAt: Date;

  updatedAt: Date;

  static toResponse(data: any){
    const transaction = data._doc;
    
    return transaction;
  }
}

export type TransactionDocument = Transaction | Document;
export const TransactionSchema = SchemaFactory.createForClass(Transaction);