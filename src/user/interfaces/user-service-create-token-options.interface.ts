import { UserDocument } from '../schemas/user.schema';

export interface TokenOptions {
  user: UserDocument;
  exp?: number;
  scopes?: string[];
}
