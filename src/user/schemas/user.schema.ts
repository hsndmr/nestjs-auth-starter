import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserToken } from './user-token.schema';
import { Exclude } from 'class-transformer';
import { BaseModel } from '../../mongoose/base-model.schema';

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: true,
})
export class User extends BaseModel<User> {
  @Prop({
    required: true,
  })
  name: string;

  @Prop({
    required: true,
  })
  lastName: string;

  @Prop({
    unique: true,
    required: true,
  })
  email: string;

  @Prop({
    required: true,
  })
  @Exclude()
  password: string;

  @Prop()
  @Exclude()
  tokens?: UserToken[];
}

export const UserSchema = SchemaFactory.createForClass(User);
