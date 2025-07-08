import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsArray, IsUUID, IsBoolean } from 'class-validator';

export class MarkNotificationsReadDto {
  @ApiPropertyOptional({
    type: [String],
    description: 'Notification IDs to mark as read',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  ids?: string[];

  @ApiPropertyOptional({ description: 'Mark all notifications as read' })
  @IsOptional()
  @IsBoolean()
  all?: boolean;
}
