import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class ParseJsonInterceptor implements NestInterceptor {
  private readonly jsonFields: string[];

  constructor(...fields: string[]) {
    this.jsonFields = fields.length ? fields : ['category'];
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    for (const field of this.jsonFields) {
      if (request.body?.[field]) {
        try {
          request.body[field] = JSON.parse(request.body[field]);
        } catch (e) {
          throw new BadRequestException(
            `Invalid JSON format for field: ${field}`,
          );
        }
      }
    }

    return next.handle();
  }
}
