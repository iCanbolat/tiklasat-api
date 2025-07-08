import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsArray, IsUUID, IsBoolean } from 'class-validator';

export class DeleteNotificationsDto {
  @ApiPropertyOptional({
    type: [String],
    description: 'Notification IDs to delete',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  ids?: string[];

  @ApiPropertyOptional({ description: 'Delete all notifications' })
  @IsOptional()
  @IsBoolean()
  all?: boolean;
}
