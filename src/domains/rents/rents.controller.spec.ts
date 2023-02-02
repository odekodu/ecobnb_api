import { Test, TestingModule } from '@nestjs/testing';
import { expect } from 'chai';
import { RentsController } from './rents.controller';
import { RentsService } from './rents.service';

describe('RentsController', () => {
  let controller: RentsController;

  before(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RentsController],
      providers: [RentsService],
    }).compile();

    controller = module.get<RentsController>(RentsController);
  });

  it('should be defined', () => {
    expect(controller).to.exist;
  });
});
