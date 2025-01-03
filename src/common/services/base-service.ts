import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DrizzleService } from 'src/database/drizzle.service';
import { PgSelect, PgTable, TableConfig } from 'drizzle-orm/pg-core';

@Injectable()
export abstract class AbstractCrudService<T extends PgTable<TableConfig>> {
  protected readonly drizzleService: DrizzleService;

  constructor(
    drizzleService: DrizzleService,
    protected readonly table: T,
  ) {
    this.drizzleService = drizzleService;
  }

  protected abstract findAll<F>(filters: F): any;

  protected abstract findOne(id: string): any;

  protected abstract create(data: any): any;

  protected abstract applyFilters?<F>(query: any, filters: F): any;

  protected abstract update(id: string, data: any): any;

  protected abstract delete(id: string): any;

  async getPaginatedResult(filters: any, baseQuery?: PgSelect) {
    const { page, pageSize } = filters || {};
    const offset = (page - 1) * pageSize;

    let query: PgSelect;

    if (baseQuery) {
      query = this.applyFilters(
        baseQuery.limit(pageSize).offset(offset),
        filters,
      );
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
    const totalRecords = await this.getTotalRecords(filters);

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

  private async getTotalRecords<F>(filters: F): Promise<number> {
    const countQuery = this.drizzleService.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(this.table);

    const query = this.applyFilters(countQuery, filters);

    const [{ count } = { count: 0 }] = await query;
    return Number(count);
  }
}
