import { BadRequestException } from '@nestjs/common';
import { CreatePersonSchema } from '@strata/validation';
import { UpdatePersonSchema } from '@strata/validation';
import type { CreatePersonDto } from './dto/create-person.dto';
import type { UpdatePersonDto } from './dto/update-person.dto';

export class PeopleDomain {
  /**
   * Validates a create-person payload using the shared Zod schema.
   * Returns the validated data or throws a BadRequestException with field-level errors.
   */
  validateCreate(data: unknown): CreatePersonDto {
    const result = CreatePersonSchema.safeParse(data);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    return result.data;
  }

  /**
   * Validates an update-person payload using the shared Zod schema.
   * Returns the validated data or throws a BadRequestException with field-level errors.
   */
  validateUpdate(data: unknown): UpdatePersonDto {
    const result = UpdatePersonSchema.safeParse(data);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    // Ensure at least one field is being updated
    if (Object.keys(result.data).length === 0) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: [{ field: 'body', message: 'At least one field must be provided for update' }],
      });
    }

    return result.data;
  }
}
