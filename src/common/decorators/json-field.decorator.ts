import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { ParseJsonInterceptor } from '../interceptors/parse-json.interceptor';

export function JsonField(...fields: string[]) {
  return applyDecorators(UseInterceptors(new ParseJsonInterceptor(...fields)));
}
