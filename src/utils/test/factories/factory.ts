import { TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Faker, faker } from '@faker-js/faker';

export abstract class Factory<T> {
  modelToken: string;

  model: Model<T>;

  faker: Faker;

  constructor() {
    this.faker = faker;
  }

  setModel(module: TestingModule) {
    this.model = module.get(getModelToken(this.modelToken));
    return this;
  }

  abstract create(): Promise<T>;
}
