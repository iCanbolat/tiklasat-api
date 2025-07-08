import { Injectable } from '@nestjs/common';
import { countDistinct, eq, sql } from 'drizzle-orm';
import { DrizzleService } from 'src/database/drizzle.service';
import {
  PgSelect,
  PgSelectBase,
  PgTable,
  TableConfig,
} from 'drizzle-orm/pg-core';
import { PaginatedResults } from '../types';

@Injectable()
export abstract class AbstractCrudService<T extends PgTable<TableConfig>> {
  protected readonly drizzleService: DrizzleService;

  constructor(
    drizzleService: DrizzleService,
    protected readonly table: any,
  ) {
    this.drizzleService = drizzleService;
  }

  protected abstract findAll<F>(filters: F): any;

  protected findOne(id: string): any {}

  protected abstract create(data: any, files?: any): any;

  // protected abstract update(id: string, data: any): any;

  protected abstract delete(id: string): any;

  protected abstract applyFilters?<F>(query: any, filters: F): any;

  protected applyPaginateJoins?(query: PgSelectBase<any, any, any>): any;

  async getPaginatedResult(
    filters: any,
    baseQuery?: PgSelect,
  ): Promise<PaginatedResults<any>> {
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
    let countQuery = this.drizzleService.db
      .select({ count: countDistinct(this.table.id) })
      .from(this.table);

    if (this.applyPaginateJoins)
      countQuery = this.applyPaginateJoins(countQuery);

    const query = this.applyFilters(countQuery, filters);

    const [{ count } = { count: 0 }] = await query;

    return Number(count);
  }
}
