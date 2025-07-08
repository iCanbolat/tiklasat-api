import {
  Controller,
  Get,
  Body,
  Patch,
  Delete,
  Query,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { GetNotificationsDto } from './dto/findall-notification.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import { MarkNotificationsReadDto } from './dto/update-notification.dto';
import { DeleteNotificationsDto } from './dto/delete-notification.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Public()
  @Get()
  findAll(@Query() query: GetNotificationsDto) {
    return this.notificationsService.findAll(query);
  }

  @Patch('mark-read')
  async markRead(@Body() dto: MarkNotificationsReadDto) {
    return this.notificationsService.markNotificationsAsRead(dto);
  }

  @Delete()
  async delete(@Body() dto: DeleteNotificationsDto) {
    return this.notificationsService.deleteNotifications(dto);
  }
}
