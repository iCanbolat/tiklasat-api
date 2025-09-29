import { Injectable } from '@nestjs/common';
import { count, countDistinct, eq, sql } from 'drizzle-orm';
import { DrizzleService } from 'src/database/drizzle.service';
import { PgTable, TableConfig } from 'drizzle-orm/pg-core';
import { PaginatedResults } from '../types';

export interface BasePaginationFilters {
  page?: number;
  pageSize?: number;
}

@Injectable()
export abstract class AbstractCrudService<T extends PgTable<TableConfig>> {
  protected readonly drizzleService: DrizzleService;

  constructor(
    drizzleService: DrizzleService,
    protected readonly table: any,
  ) {
    this.drizzleService = drizzleService;
  }

  protected abstract findAll<F extends BasePaginationFilters>(filters: F): any;

  protected findOne(id: string): any {}

  protected abstract create(data: any, files?: any): any;

  protected abstract delete(id: string): any;

  protected abstract applyFilters<F>(
    query: any,
    filters: F,
    skipOrderBy?: boolean,
  ): any;

  // Optional method to apply joins for pagination queries
  protected applyPaginationJoins?(query: any): any;

  async getPaginatedResult<F extends BasePaginationFilters>(
    filters: F,
    baseQuery?: any,
    customCountQuery?: any,
  ): Promise<PaginatedResults<any>> {
    const { page = 1, pageSize = 10 } = filters;
    const offset = (page - 1) * pageSize;

    let dataQuery: any;

    if (baseQuery) {
      dataQuery = this.applyFilters(
        baseQuery.limit(pageSize).offset(offset),
        filters,
      );
    } else {
      dataQuery = this.applyFilters(
        this.drizzleService.db
          .select()
          .from(this.table)
          .limit(pageSize)
          .offset(offset),
        filters,
      );
    }

    const [data, totalRecords] = await Promise.all([
      dataQuery,
      this.getTotalRecords(filters, customCountQuery),
    ]);

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

  private async getTotalRecords<F>(
    filters: F,
    customCountQuery?: any,
  ): Promise<number> {
    let countQuery: any;

    if (customCountQuery) {
      countQuery = this.applyFilters(customCountQuery, filters, true);
    } else {
      countQuery = this.drizzleService.db
        .select({ count: count(this.table.id) })
        .from(this.table);

      if (this.applyPaginationJoins) {
        countQuery = this.applyPaginationJoins(countQuery);
      }

      countQuery = this.applyFilters(countQuery, filters, true);
    }

    const result = await countQuery;
    const totalCount = result[0]?.count || 0;

    return Number(totalCount);
  }
}
