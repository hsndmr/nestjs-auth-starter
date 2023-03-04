import { UserDocument } from '../../user/schemas/user.schema';
import { LoginUserDto } from '../dtos/login-user.dto';

export interface UserLoginContext {
  dto?: LoginUserDto;

  status?: number;

  error?: string;

  user?: UserDocument;

  token?: string;
}

export type UserLoginServiceSchema = {
  findUserById: {
    data: {
      user?: UserDocument;
      error?: string;
      status?: number;
    };
  };

  checkPassword: {
    data: void;
  };

  createToken: {
    data: {
      token: string;
    };
  };
};
