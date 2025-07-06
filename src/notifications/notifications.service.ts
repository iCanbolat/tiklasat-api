import { Injectable } from '@nestjs/common';
import { DrizzleService } from 'src/database/drizzle.service';
import { NotificationTable } from 'src/database/schemas/notifications.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsGateway } from './notifications.gateway';
import {
  GetNotificationsDto,
  NotificationOrderEnum,
} from './dto/findall-notification.dto';
import { AbstractCrudService } from 'src/common/services/base-service';
import { and, asc, desc, eq, ilike, or } from 'drizzle-orm';

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
  protected async applyFilters(query: any, filters: GetNotificationsDto) {
    const { isRead, orderByDate, type, search } = filters;

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(NotificationTable.message, `%${filters.search}%`),
          ilike(NotificationTable.title, `%${filters.search}%`),
        ),
      );
    }

    if (isRead) {
      conditions.push(eq(NotificationTable.isRead, isRead));
    }

    if (type) {
      conditions.push(eq(NotificationTable.type, type));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    if (orderByDate === NotificationOrderEnum.ASC) {
      query = query.orderBy(asc(NotificationTable.createdAt));
    } else if (orderByDate === NotificationOrderEnum.DESC) {
      query = query.orderBy(desc(NotificationTable.createdAt));
    } else {
      query = query.orderBy(desc(NotificationTable.createdAt));
    }

    return query;
  }
}
