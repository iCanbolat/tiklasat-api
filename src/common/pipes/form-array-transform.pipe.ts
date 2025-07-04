import {
  PipeTransform,
  Injectable,
  BadRequestException,
  ArgumentMetadata,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync, ValidationError } from 'class-validator';

@Injectable()
export class FormArrayTransformPipe implements PipeTransform {
  constructor(private readonly DtoClass: any) {}

  transform(value: any, metadata: ArgumentMetadata) {
    let dtos: any[] = [];

    if (Array.isArray(value)) {
      dtos = value;
    } else if (value && typeof value === 'object') {
      dtos = [value];
    } else {
      throw new BadRequestException(
        'Validation failed (expected object or array)',
      );
    }

    const instances = dtos.map((item) => plainToInstance(this.DtoClass, item));
    const errors = instances.map((inst) => validateSync(inst as object)).flat();

    if (errors.length > 0) {
      throw new BadRequestException(this.formatErrors(errors));
    }

    return instances;
  }

  private formatErrors(errors: ValidationError[]): any {
    const result = {};
    errors.forEach((err) => {
      const constraints = err.constraints;
      if (constraints) result[err.property] = Object.values(constraints);
    });
    return result;
  }
}
