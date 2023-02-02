import { ApiProperty } from "@nestjs/swagger";

export class CreateRentDto {
  @ApiProperty({ description: 'The property to request rent', required: true })
  property: string;

  @ApiProperty({ description: 'The duration of the rent (Days)', required: true })
  duration: number;
}
