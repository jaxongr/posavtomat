import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/** Cursor-based pagination (offset is forbidden by project rules). */
export class PaginationDto {
  @ApiPropertyOptional({ description: 'Last seen id (cursor)' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ enum: ['next', 'prev'], default: 'next' })
  @IsOptional()
  @IsIn(['next', 'prev'])
  direction: 'next' | 'prev' = 'next';
}

/** Helper to build the { items, meta } envelope from a take+1 query result. */
export function buildPage<T extends { id: string }>(
  rows: T[],
  limit: number,
): { items: T[]; meta: { total: number; cursor?: string; hasNext: boolean } } {
  const hasNext = rows.length > limit;
  const items = hasNext ? rows.slice(0, limit) : rows;
  return {
    items,
    meta: {
      total: items.length,
      cursor: items.length ? items[items.length - 1].id : undefined,
      hasNext,
    },
  };
}
