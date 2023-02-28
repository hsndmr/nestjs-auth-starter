import { CreateUserDto } from '../dtos/create-user.dto';
import { User, UserDocument } from '../../user/schemas/user.schema';

export interface UserCreatorContext {
  dto?: CreateUserDto;
  user?: User;
  token?: string;
  error?: any;
  status?: any;
}

export type UserCreatorServiceSchema = {
  createUser: {
    data: {
      user: UserDocument;
      token: string;
    };
  };
};
