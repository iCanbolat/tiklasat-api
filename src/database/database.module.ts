import { Global, Module } from '@nestjs/common';
import {
  ConfigurableDatabaseModule,
  CONNECTION_POOL,
  DATABASE_OPTIONS,
} from './database.module-definition';
import { DatabaseOptions } from './database-options';
import { Pool } from 'pg';
import { DrizzleService } from './drizzle.service';

@Global()
@Module({
  exports: [DrizzleService],
  providers: [
    DrizzleService,
    {
      provide: CONNECTION_POOL,
      inject: [DATABASE_OPTIONS],
      useFactory: (databaseOptions: DatabaseOptions) => {
        return new Pool({
          host: databaseOptions.host,
          port: databaseOptions.port,
          user: databaseOptions.user,
          password: databaseOptions.password,
          database: databaseOptions.database,
          ssl:
            process.env.NODE_ENV === 'production'
              ? { rejectUnauthorized: false }
              : false,
          connectionTimeoutMillis: 10000,
          idleTimeoutMillis: 30000,
          max: 20,
        });
      },
    },
  ],
})
export class DatabaseModule extends ConfigurableDatabaseModule {}
