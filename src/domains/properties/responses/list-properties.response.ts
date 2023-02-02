import { ApiProperty, PickType } from "@nestjs/swagger";
import { ResponseSchema } from "../../../shared/response.schema";
import { Property } from "../entities/property.entity";

export class ListPropertiesResponse extends PickType(ResponseSchema<Property[]>, ['payload', 'timestamp', 'success']){
  @ApiProperty({ description: 'The payload of the response', type: [Property] })
  payload?: Property[];
}