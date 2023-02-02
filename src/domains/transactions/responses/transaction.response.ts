import { ApiProperty, PickType } from "@nestjs/swagger";
import { ResponseSchema } from "../../../shared/response.schema";
import { Transaction } from "../entities/transaction.entity";

export class TransactionResponse extends PickType(ResponseSchema<Transaction>, ['payload', 'timestamp', 'success']){
  @ApiProperty({ description: 'The payload of the response', type: Transaction })
  payload?: Transaction;
}