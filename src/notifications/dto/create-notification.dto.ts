import { IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';
import {
  NotificationEnum,
  NotificationEnumType,
} from 'src/database/schemas/notifications.schema';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty({ enum: NotificationEnum.Enum })
  @IsEnum(NotificationEnum.Enum)
  type: NotificationEnumType;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  link?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;
}
