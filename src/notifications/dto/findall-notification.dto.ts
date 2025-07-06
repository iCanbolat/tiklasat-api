import { Type } from 'class-transformer';
import {
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsString,
} from 'class-validator';
import {
  NotificationEnum,
  NotificationEnumType,
} from 'src/database/schemas/notifications.schema';

export enum NotificationOrderEnum {
  ASC = 'asc',
  DESC = 'desc',
}

export class GetNotificationsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pageSize?: number = 10;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isRead?: boolean;

  @IsOptional()
  @IsEnum(NotificationOrderEnum)
  orderByDate?: NotificationOrderEnum = NotificationOrderEnum.DESC;

  @IsOptional()
  @IsEnum(NotificationEnum.Enum)
  type?: NotificationEnumType;
}
