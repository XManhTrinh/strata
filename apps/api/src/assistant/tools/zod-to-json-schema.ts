import { z, ZodType, ZodTypeAny } from 'zod';

/**
 * Minimal Zod → JSON Schema converter covering the shapes the assistant tools
 * use (objects of optional strings/numbers/booleans). Kept small on purpose;
 * extend if richer tool parameters are added.
 */
export function zodToJsonSchema(schema: ZodType): Record<string, unknown> {
  return convert(schema as ZodTypeAny);
}

function convert(schema: ZodTypeAny): Record<string, unknown> {
  if (schema instanceof z.ZodOptional) {
    return convert(schema.unwrap() as ZodTypeAny);
  }
  if (schema instanceof z.ZodDefault) {
    return convert(schema._def.innerType as ZodTypeAny);
  }
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, ZodTypeAny>;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [key, value] of Object.entries(shape)) {
      properties[key] = convert(value);
      if (!isOptional(value)) required.push(key);
    }
    const out: Record<string, unknown> = { type: 'object', properties };
    if (required.length > 0) out.required = required;
    return out;
  }
  if (schema instanceof z.ZodString) return { type: 'string' };
  if (schema instanceof z.ZodNumber) return { type: 'number' };
  if (schema instanceof z.ZodBoolean) return { type: 'boolean' };
  if (schema instanceof z.ZodEnum) {
    return { type: 'string', enum: schema._def.values };
  }
  if (schema instanceof z.ZodArray) {
    return { type: 'array', items: convert(schema.element as ZodTypeAny) };
  }
  // Fallback — permit anything.
  return {};
}

function isOptional(schema: ZodTypeAny): boolean {
  return schema instanceof z.ZodOptional || schema instanceof z.ZodDefault;
}
