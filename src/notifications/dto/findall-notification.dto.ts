import { Transform, Type } from 'class-transformer';
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
  @Transform(
    ({ value }) => {
      if (value === 'true') return true;
      if (value === 'false') return false;
      return undefined;
    },
    { toClassOnly: true },
  )
  isRead?: boolean;

  @IsOptional()
  @IsEnum(NotificationEnum.enum, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  types?: NotificationEnumType[];

  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'title' | 'type' | 'isRead' = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
