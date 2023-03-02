import { UserDocument } from '../../user/schemas/user.schema';
import { JwtPayload } from 'jsonwebtoken';

export interface JwtValidatorContext {
  authorizationHeader?: string | string[];
  token?: string;
  user?: UserDocument;
  verifiedToken?: JwtPayload;
}

export type JwtValidatorServiceSchema = {
  verifyToken: {
    data: {
      verifiedToken: JwtPayload;
    };
  };

  verifyUser: {
    data: {
      user: UserDocument;
    };
  };

  checkScopes: {
    data: boolean;
  };
};
