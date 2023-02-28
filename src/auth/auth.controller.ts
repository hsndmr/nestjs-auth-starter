import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
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

@Controller(AUTH_ROUTE_PREFIX)
@UseInterceptors(MongooseClassSerializerInterceptor(UserModel))
export class AuthController {
  constructor(
    private readonly userService: UserService,
    private i18n: I18nService,
    private readonly logger: AppLogger,
  ) {}

  @Post('user')
  createUser(@Body() createUserDto: CreateUserDto) {
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
                const token = await this.userService.createToken({
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
}
