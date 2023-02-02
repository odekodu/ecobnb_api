import { Test, TestingModule } from '@nestjs/testing';
import { expect } from 'chai';
import { RentsService } from './rents.service';

describe('RentsService', () => {
  let service: RentsService;

  before(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RentsService],
    }).compile();

    service = module.get<RentsService>(RentsService);
  });

  it('should be defined', () => {
    expect(service).to.exist;
  });
});
