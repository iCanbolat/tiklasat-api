import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { PgSelectQueryBuilder } from 'drizzle-orm/pg-core';
import { DrizzleService } from 'src/database/drizzle.service';

export interface PaginationOptions {
  page: number;
  pageSize: number;
}

export interface FilterOptions {
  [key: string]: any;
}

import { PgTable, TableConfig } from 'drizzle-orm/pg-core';

@Injectable()
export abstract class AbstractCrudService<T extends PgTable<TableConfig>> {
  protected abstract readonly table: T;

  constructor(protected readonly drizzleService: DrizzleService) {}

  async findAll(
    filters: FilterOptions,
    pagination: PaginationOptions,
    joins?: (query: PgSelectQueryBuilder<any>) => void,
  ) {
    const { page, pageSize } = pagination;
    const offset = (page - 1) * pageSize;

    let query: PgSelectQueryBuilder<any> = this.drizzleService.db
      .select()
      .from(this.table) as any;

    // Apply joins if any
    if (joins) {
      query = joins(query) as any;
    }

    // Apply filters dynamically
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          query = query.where(this.table[key].in(value));
        } else if (value.min !== undefined && value.max !== undefined) {
          query = query.where(this.table[key].between(value.min, value.max));
        } else {
          query = query.where(eq(this.table[key], value));
        }
      }
    });

    // Add pagination
    query.limit(pageSize).offset(offset);

    const totalRecords = await this.drizzleService.db
      .select({ count: sql<number>`COUNT(*)`.as('count') })
      .from(this.table)
      .execute();

    const records = await query;

    return {
      data: records,
      pagination: {
        totalRecords,
        page,
        pageSize,
        totalPages: Math.ceil(totalRecords[0].count / pageSize),
      },
    };
  }
}
