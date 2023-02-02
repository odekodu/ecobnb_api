import { CreateRentDto } from "../../src/domains/rents/dto/create-rent.dto";
import { Rent } from "../../src/domains/rents/entities/rent.entity";
import { RentState } from "../../src/shared/rent.state";

export const createRentStub = (property: string): CreateRentDto => ({
  property,
  duration: 1
});

export const rentStub: Partial<Rent> = {
  duration: 1,
  status: RentState.REQUEST,
};

