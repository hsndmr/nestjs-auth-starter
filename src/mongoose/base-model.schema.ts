import { Exclude, Transform } from 'class-transformer';

export class BaseModel<T> {
  constructor(partial: Partial<T>) {
    Object.assign(this, partial);
  }

  @Transform((value) => value.obj._id.toString())
  _id?: string;

  @Exclude()
  __v?: number;
}
