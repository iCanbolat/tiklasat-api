import {
  Controller,
  Get,
  Body,
  Patch,
  Delete,
  Query,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { GetNotificationsDto } from './dto/findall-notification.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { DeleteNotificationsDto } from './dto/delete-notification.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Public()
  @Get()
  findAll(@Query() query: GetNotificationsDto) {
    return this.notificationsService.findAll(query);
  }

  @Public()
  @Patch(':id?')
  async markRead(
    @Body() updateNotificationDto: UpdateNotificationDto,
    @Param('id') id?: string,
  ) {
    if (updateNotificationDto.all) {
      return this.notificationsService.markAllAsRead();
    }

    if (!id) {
      throw new BadRequestException(
        'Notification ID is required if not using all flag',
      );
    }

    return this.notificationsService.markAsRead(id);
  }

  @Public()
  @Delete(':id?')
  async delete(@Body() dto: DeleteNotificationsDto, @Param('id') id?: string) {
    if (dto.all) {
      return this.notificationsService.deleteNotifications();
    }

    if (!id) {
      throw new BadRequestException(
        'Notification ID is required if not using all flag',
      );
    }

    return this.notificationsService.delete(id);
  }
}
