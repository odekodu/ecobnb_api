import { ApiProperty, PartialType } from '@nestjs/swagger';
import { RentState } from '../../../shared/rent.state';

export class UpdateRentDto {
  @ApiProperty({ description: 'The status of the rent' })
  status?: RentState;

  @ApiProperty({ description: 'The duration of the rent (Days)' })
  duration?: number;
}
