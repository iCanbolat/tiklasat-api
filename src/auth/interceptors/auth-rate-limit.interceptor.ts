import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap, catchError } from 'rxjs';

@Injectable()
export class AuthRateLimitInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const rateLimitData = request['rateLimitData'];

    return next.handle().pipe(
      tap(() => {
        // Success - reset rate limit counter
        if (rateLimitData?.resetCount) {
          rateLimitData.resetCount();
        }
      }),
      catchError((error) => {
        // Failed authentication - increment counter
        if (rateLimitData?.incrementCount) {
          rateLimitData.incrementCount();
        }
        throw error;
      }),
    );
  }
}
