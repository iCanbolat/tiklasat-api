import { Injectable } from '@nestjs/common';
import { DrizzleService } from 'src/database/drizzle.service';
import { NotificationTable } from 'src/database/schemas/notifications.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsGateway } from './notifications.gateway';
import { GetNotificationsDto } from './dto/findall-notification.dto';
import { AbstractCrudService } from 'src/common/services/base-service';
import { and, eq, ilike, inArray, or } from 'drizzle-orm';
import { MarkNotificationsReadDto } from './dto/update-notification.dto';
import { DeleteNotificationsDto } from './dto/delete-notification.dto';

@Injectable()
export class NotificationsService extends AbstractCrudService<
  typeof NotificationTable
> {
  constructor(
    protected readonly drizzleService: DrizzleService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {
    super(drizzleService, NotificationTable);
  }

  async create(createNotificationDto: CreateNotificationDto) {
    const [notification] = await this.drizzleService.db
      .insert(NotificationTable)
      .values(createNotificationDto)
      .returning();

    this.notificationsGateway.sendNotificationToAll(notification);

    return notification;
  }

  async findAll(getNotificationDto: GetNotificationsDto) {
    let query = this.drizzleService.db
      .select()
      .from(NotificationTable)
      .$dynamic();

    const paginatedResults = await this.getPaginatedResult(
      getNotificationDto,
      query,
    );

    return {
      data: paginatedResults.data,
      pagination: paginatedResults.pagination,
    };
  }
  protected delete(id: string) {
    throw new Error('Method not implemented.');
  }

  async markNotificationsAsRead(dto: MarkNotificationsReadDto) {
    const { ids, all } = dto;

    if (all) {
      await this.drizzleService.db
        .update(NotificationTable)
        .set({ isRead: true })
        .execute();

      return { message: 'All notifications marked as read' };
    }

    if (ids && ids.length > 0) {
      await this.drizzleService.db
        .update(NotificationTable)
        .set({ isRead: true })
        .where(inArray(NotificationTable.id, ids))
        .execute();

      return { message: `Marked ${ids.length} notifications as read` };
    }

    throw new Error(
      'Provide either "all" or "ids" to mark notifications as read',
    );
  }

  async deleteNotifications(dto: DeleteNotificationsDto) {
    const { ids, all } = dto;

    if (all) {
      await this.drizzleService.db.delete(NotificationTable).execute();

      return { message: 'All notifications deleted' };
    }

    if (ids && ids.length > 0) {
      await this.drizzleService.db
        .delete(NotificationTable)
        .where(inArray(NotificationTable.id, ids))
        .execute();

      return { message: `Deleted ${ids.length} notifications` };
    }

    throw new Error('Provide either "all" or "ids" to delete notifications');
  }

  protected async applyFilters(query: any, filters: GetNotificationsDto) {
    const { isRead, types, search } = filters;

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(NotificationTable.message, `%${filters.search}%`),
          ilike(NotificationTable.title, `%${filters.search}%`),
        ),
      );
    }

    if (isRead !== undefined) {
      conditions.push(eq(NotificationTable.isRead, isRead));
    }

    if (types) {
      conditions.push(inArray(NotificationTable.type, types));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return query;
  }
}
