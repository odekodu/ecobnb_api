import { ApiProperty, PickType } from "@nestjs/swagger";
import { ResponseSchema } from "../../../shared/response.schema";
import { Rent } from "../entities/rent.entity";

export class ListRentsResponse extends PickType(ResponseSchema<Rent[]>, ['payload', 'timestamp', 'success']){
  @ApiProperty({ description: 'The payload of the response', type: [Rent] })
  payload?: Rent[];
}