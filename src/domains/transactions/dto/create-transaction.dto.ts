import { ApiProperty } from "@nestjs/swagger";
import { RentState } from "../../../shared/rent.state";
import { TransactableEnum } from "./transactable.enum";

export class CreateTransactionDto {
  @ApiProperty({ description: 'amount of the account the transaction', required: true })
  amount: number;

  @ApiProperty({ description: 'Address of the account the transaction is from', required: true })
  from: string;

  @ApiProperty({ description: 'Address of the account the transaction is going to', required: true })
  to: string;

  @ApiProperty({ description: 'The type of transaction', required: true, enum: RentState })
  transactable: TransactableEnum;

  @ApiProperty({ description: 'The Item that is being transacted', required: true })
  item: string;

  @ApiProperty({ description: 'The platform the transaction is performed on', required: true })
  platform: string;

  @ApiProperty({ description: 'The identifier of the transaction on the platform', required: true })
  reference: number;
}
