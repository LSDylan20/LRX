import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { UserRole } from '@lanerunner/common';

export class CreateUserDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'User password',
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    example: 'John',
    description: 'User first name',
    required: false,
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({
    example: 'Doe',
    description: 'User last name',
    required: false,
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.SHIPPER,
    description: 'User role',
  })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Company ID',
    required: false,
  })
  @IsString()
  @IsOptional()
  companyId?: string;
}
