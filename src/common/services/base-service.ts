import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from 'src/database/drizzle.service';
import { PgSelectBase, PgTable } from 'drizzle-orm/pg-core';

@Injectable()
export abstract class AbstractCrudService<T extends PgTable<any>> {
  protected readonly drizzleService: DrizzleService;

  constructor(
    drizzleService: DrizzleService,
    protected readonly table: T,
  ) {
    this.drizzleService = drizzleService;
  }

  async getPaginatedResult<F>(filters: any, baseQuery?: F) {
    const { page, pageSize } = filters || {};
    const offset = (page - 1) * pageSize;

    let query: PgSelectBase<any, any, any>;

    if (baseQuery) {
      query = this.applyFilters(baseQuery, filters);
    } else {
      query = this.applyFilters(
        this.drizzleService.db
          .select()
          .from(this.table)
          .limit(pageSize)
          .offset(offset),
        filters,
      );
    }

    const data = await query;
    const totalRecords = await this.getTotalRecords<F>(filters);

    return {
      data,
      pagination: {
        totalRecords,
        page,
        pageSize,
        totalPages: Math.ceil(totalRecords / pageSize),
      },
    };
  }

  protected abstract findAll<F>(filters: F): any;

  protected abstract applyFilters?<F>(query: any, filters: F): any;

  private async getTotalRecords<F>(filters: F): Promise<number> {
    const countQuery = this.drizzleService.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(this.table);

    const query = this.applyFilters(countQuery, filters);

    const [{ count }] = await query;
    return Number(count);
  }
}
