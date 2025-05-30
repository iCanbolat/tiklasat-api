import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from 'src/database/schemas/users.schema';

export class SignUpDto {
  @ApiProperty({
    description: 'First name of the new user',
    example: 'John',
  })
  @IsString()
  @MinLength(1)
  firstName: string;

  @ApiProperty({
    description: 'Last name of the new user',
    example: 'Doe',
  })
  @IsString()
  @MinLength(1)
  lastName: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'ADMIN', enum: UserRole, required: false })
  role?: string;

  @ApiProperty({
    description: 'Email of the new user',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Password of the new user',
    example: 'z1Tlxb1tuXH7',
    minLength: 6,
  })
  @IsString()
  @MinLength(8)
  password: string;
}
