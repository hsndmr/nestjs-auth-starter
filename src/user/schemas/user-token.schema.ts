import { Prop, Schema } from '@nestjs/mongoose';

@Schema({
  timestamps: true,
})
export class UserToken {
  constructor(partial: Partial<UserToken>) {
    Object.assign(this, partial);
  }

  @Prop({
    required: true,
  })
  jti: string;

  @Prop({
    required: true,
  })
  expires_at: Date;

  @Prop()
  revoked_at?: Date;

  @Prop()
  scopes?: string[];
}
