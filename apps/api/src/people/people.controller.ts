import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { PeopleService } from './people.service';

@Controller('people')
export class PeopleController {
  constructor(private readonly peopleService: PeopleService) {}

  @Post()
  async create(@Body() body: unknown, @Req() req: Request) {
    const userId = (req as any).user?.sub;
    return this.peopleService.create(body, userId);
  }

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 20;
    return this.peopleService.findAll(pageNum, pageSizeNum);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.peopleService.findById(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.sub;
    return this.peopleService.update(id, body, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.sub;
    return this.peopleService.delete(id, userId);
  }
}
