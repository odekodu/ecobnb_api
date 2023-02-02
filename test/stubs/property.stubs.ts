import { CreatePropertyDto } from "../../src/domains/properties/dto/create-property.dto"
import { Property } from "../../src/domains/properties/entities/property.entity"


export const createPropertyStub: CreatePropertyDto = {
  country: 'Nigeria',
  state: 'Lagos',
  city: 'Ikorodu',
  address: 'No. 1 ABC street',
  price: 5000,
  title: 'A Property',
  description: 'To be described as ...',
};

export const propertyStub: Partial<Property> = {
  ...createPropertyStub,
  active: false,
  images: [],
};

