import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Model } from 'mongoose';
import { CreateUserDto } from '../auth/dtos/create-user.dto';
import { JwtService } from '../jwt/jwt.service';
import { CryptoService } from '../crypto/crypto.service';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
    private readonly cryptoService: CryptoService,
  ) {}

  async findOneById(id: string): Promise<UserDocument> {
    return this.userModel.findById(id);
  }

  async findOneByEmail(email: string): Promise<UserDocument> {
    return this.userModel.findOne({
      email: email,
    });
  }

  async createFromDto(dto: CreateUserDto): Promise<UserDocument> {
    return this.create({
      email: dto.email,
      password: dto.password,
      name: dto.name,
      lastName: dto.lastName,
    });
  }

  async create(user: User): Promise<UserDocument> {
    const createdUser = new this.userModel({
      ...user,
      password: await this.cryptoService.hashPassword(user.password),
    });
    return createdUser.save();
  }
}
