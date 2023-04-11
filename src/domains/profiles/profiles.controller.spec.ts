import { Test, TestingModule } from '@nestjs/testing';
import { expect } from 'chai';
import { ProfilesController } from './profiles.controller';

describe('ProfilesController', () => {
  let controller: ProfilesController;

  before(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfilesController],
    }).compile();

    controller = module.get<ProfilesController>(ProfilesController);
  });

  it('should be defined', () => {
    expect(controller).to.exist;
  });
});
