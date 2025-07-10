import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';

export class DeleteNotificationsDto {
  @ApiPropertyOptional({ description: 'Delete all notifications' })
  @IsOptional()
  @IsBoolean()
  all?: boolean;
}
