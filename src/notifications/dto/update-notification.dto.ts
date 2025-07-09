import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateNotificationDto {
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @IsOptional()
  @IsBoolean()
  all?: boolean;
}
