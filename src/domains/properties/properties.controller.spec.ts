import { Test, TestingModule } from '@nestjs/testing';
import { expect } from 'chai';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';

describe('PropertiesController', () => {
  let controller: PropertiesController;

  before(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PropertiesController],
      providers: [PropertiesService],
    }).compile();

    controller = module.get<PropertiesController>(PropertiesController);
  });

  it('should be defined', () => {
    expect(controller).to.exist;
  });
});
