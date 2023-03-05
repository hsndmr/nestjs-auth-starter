import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: 'User email',
    example: 'user@test.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User name',
    example: 'name',
  })
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'User last name',
    example: 'last name',
  })
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    description: 'User password',
    example: 'password',
  })
  @IsNotEmpty()
  password: string;
}
