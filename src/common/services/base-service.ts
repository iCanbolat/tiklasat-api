// import { count, eq, InferSelectModel } from 'drizzle-orm';
// import { Injectable } from '@nestjs/common';
// import { PgSelect, PgTable, TableConfig } from 'drizzle-orm/pg-core';
// import { DrizzleService } from 'src/database/drizzle.service';

// export interface FindAllParams<TTable extends PgTable<TableConfig>> {
//   page?: number;
//   limit?: number;
//   filters?: any;
//   query: TTable;
// }

// @Injectable()
// export abstract class BaseService<TTable extends PgTable<TableConfig>> {
//   constructor(
//     protected readonly drizzleService: DrizzleService,
//     protected readonly table: TTable,
//   ) {}

//   async findAll(
//     params?: FindAllParams<TTable>,
//   ): Promise<{ data: TTable[]; total?: number }> {
//     const { page, limit, filters, query: baseQuery } = params || {};
//     let query: PgSelect<any, any>;
//     if (baseQuery) {
//       query = baseQuery as unknown as PgSelect<any, any>;
//     } else {
//       query = this.drizzleService.db.select().from(this.table) as unknown as PgSelect<any, any>;
//     }

//     if (filters) {
//       for (const [key, value] of Object.entries(filters)) {
//         if (this.table[key]) {
//           query.where(eq(this.table[key], value));
//         }
//       }
//     }

//     if (page && limit) {
//       const offset = (page - 1) * limit;
//       query.limit(limit).offset(offset);

//       const [data, total] = await Promise.all([
//         query,
//         this.drizzleService.db
//           .select({ count: count() })
//           .from(this.table)
//           .then((res) => Number(res[0].count)),
//       ]);

//       return { data: data as TTable[], total };
//     }

//     const data = await query;
//     return { data: data as TTable[] };
//   }
// }
