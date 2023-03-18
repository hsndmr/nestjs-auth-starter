import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CreateUserDto } from './dtos/create-user.dto';
import { interpret } from 'xstate';
import userCreatorMachine from './machines/user-creator.machine';
import { UserService } from '../user/user.service';
import { I18nService } from 'nestjs-i18n';
import { AppLogger } from '../logger/app-logger.service';
import MongooseClassSerializerInterceptor from '../mongoose/interceptors/mongoose-class-serializer.interceptor';
import { User as UserModel, UserDocument } from '../user/schemas/user.schema';
import { JwtAuthGuard } from './jwt-auth.guard';
import { User } from './decorators/user.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AUTH_ROUTE_PREFIX } from '../constants/route';
import { TokenService } from '../user/token.service';
import { LoginUserDto } from './dtos/login-user.dto';
import { userLoginMachine } from './machines/user-login.machine';
import { CryptoService } from '../crypto/crypto.service';
import { Response } from 'express';
import { COOKIE_JWT_KEY } from './constants';

@Controller(AUTH_ROUTE_PREFIX)
@UseInterceptors(MongooseClassSerializerInterceptor(UserModel))
export class AuthController {
  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
    private i18n: I18nService,
    private readonly logger: AppLogger,
    private readonly cryptoService: CryptoService,
  ) {}

  @Post('register')
  createUser(
    @Body() createUserDto: CreateUserDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const service = interpret(
      userCreatorMachine
        .withContext({
          dto: createUserDto,
        })
        .withConfig({
          services: {
            checkUserIfExists: async (context) => {
              try {
                const user = await this.userService.findOneByEmail(
                  context.dto.email,
                );

                if (user) {
                  return Promise.reject({
                    error: 'User already exists',
                    status: HttpStatus.BAD_REQUEST,
                  });
                }

                return Promise.resolve(true);
              } catch (e) {
                this.logger.error(e);
                return Promise.reject({
                  error: this.i18n.translate('errors.server'),
                  status: 500,
                });
              }
            },
            createUser: async (context) => {
              try {
                const user = await this.userService.createFromDto(context.dto);
                const token = await this.tokenService.create({
                  user,
                });
                return Promise.resolve({
                  user,
                  token,
                });
              } catch (e) {
                this.logger.error(e);
                return Promise.reject({
                  error: this.i18n.translate('errors.server'),
                  status: HttpStatus.INTERNAL_SERVER_ERROR,
                });
              }
            },
          },
        }),
    );

    return new Promise((resolve, reject) => {
      service
        .onDone(() => {
          const snapshot = service.getSnapshot();

          if (snapshot.matches('error')) {
            reject(
              new HttpException(
                snapshot.context.error,
                snapshot.context.status,
              ),
            );

            return;
          }

          response.cookie(COOKIE_JWT_KEY, snapshot.context.token, {
            httpOnly: true,
            sameSite: 'strict',
          });

          resolve({
            user: snapshot.context.user,
            token: snapshot.context.token,
          });
        })
        .start();
    });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('user')
  async getUser(@User() user: UserDocument) {
    return user;
  }

  @Post('login')
  async login(
    @Body() loginUserDto: LoginUserDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const service = interpret(
      userLoginMachine
        .withContext({
          dto: loginUserDto,
        })
        .withConfig({
          services: {
            findUserById: async (context) => {
              try {
                const user = await this.userService.findOneByEmail(
                  context.dto.email,
                );

                if (!user) {
                  return Promise.reject({
                    error: this.i18n.translate('auth.notFoundUser'),
                    status: HttpStatus.BAD_REQUEST,
                  });
                }

                return Promise.resolve({
                  user,
                });
              } catch (e) {
                this.logger.error(e);
                return Promise.reject({
                  error: this.i18n.translate('errors.server'),
                  status: HttpStatus.INTERNAL_SERVER_ERROR,
                });
              }
            },
            checkPassword: async (context) => {
              const { user, dto } = context;

              try {
                const isMatch = await this.cryptoService.comparePasswords(
                  dto.password,
                  user.password,
                );

                if (!isMatch) {
                  return Promise.reject({
                    error: this.i18n.translate('auth.wrongPassword'),
                    status: HttpStatus.BAD_REQUEST,
                  });
                }

                return Promise.resolve();
              } catch (e) {
                this.logger.error(e);
                return Promise.reject({
                  error: this.i18n.translate('errors.server'),
                  status: HttpStatus.INTERNAL_SERVER_ERROR,
                });
              }
            },
            createToken: async (context) => {
              try {
                const token = await this.tokenService.create({
                  user: context.user,
                });

                return Promise.resolve({
                  token,
                });
              } catch (e) {
                this.logger.error(e);
                return Promise.reject({
                  error: this.i18n.translate('errors.server'),
                  status: HttpStatus.INTERNAL_SERVER_ERROR,
                });
              }
            },
          },
        }),
    );

    return new Promise((resolve, reject) => {
      service
        .onDone(() => {
          const snapshot = service.getSnapshot();

          if (!snapshot.matches('tokenCreated')) {
            reject(
              new HttpException(
                snapshot.context.error,
                snapshot.context.status,
              ),
            );

            return;
          }

          response.cookie(COOKIE_JWT_KEY, snapshot.context.token, {
            httpOnly: true,
            sameSite: 'strict',
          });

          resolve({
            user: snapshot.context.user,
            token: snapshot.context.token,
          });
        })
        .start();
    });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @Res({ passthrough: true }) response: Response,
    @User() user: UserDocument,
  ) {
    await this.tokenService.revokeByJtiAndUserId(user._id, user.tokens[0].jti);
    response.clearCookie(COOKIE_JWT_KEY);
    return {};
  }
}
