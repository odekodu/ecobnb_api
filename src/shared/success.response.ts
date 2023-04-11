import { ApiProperty, PickType } from "@nestjs/swagger";
import { ResponseSchema } from "../shared/response.schema";

export class SuccessResponse extends PickType(ResponseSchema, ['timestamp', 'success']){
}