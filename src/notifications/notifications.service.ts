import { Injectable, NotFoundException } from '@nestjs/common';
import { DrizzleService } from 'src/database/drizzle.service';
import { NotificationTable } from 'src/database/schemas/notifications.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsGateway } from './notifications.gateway';
import { GetNotificationsDto } from './dto/findall-notification.dto';
import { AbstractCrudService } from 'src/common/services/base-service';
import { and, asc, desc, eq, ilike, inArray, or } from 'drizzle-orm';
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
  async markAsRead(id: string) {
    const [notification] = await this.drizzleService.db
      .update(NotificationTable)
      .set({ isRead: true })
      .where(eq(NotificationTable.id, id))
      .returning();

    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  async markAllAsRead() {
    await this.drizzleService.db
      .update(NotificationTable)
      .set({ isRead: true })
      .where(eq(NotificationTable.isRead, false));

    return { message: 'All notifications marked as read' };
  }

  async delete(id: string) {
    await this.drizzleService.db
      .delete(NotificationTable)
      .where(eq(NotificationTable.id, id))
      .execute();
    return { message: `Deleted  notification: ${id}` };
  }

  async deleteNotifications() {
    await this.drizzleService.db.delete(NotificationTable).execute();

    return { message: 'All notifications deleted' };
  }

  protected async applyFilters(
    query: any,
    filters: GetNotificationsDto,
    skipOrderBy: boolean = false,
  ) {
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

    if (!skipOrderBy)
      query = query.orderBy(
        asc(NotificationTable.isRead),
        desc(NotificationTable.createdAt),
      );

    return query;
  }
}
