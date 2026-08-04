import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import type { CreatePersonDto } from './dto/create-person.dto';
import type { UpdatePersonDto } from './dto/update-person.dto';

export interface PaginationParams {
  page: number;
  pageSize: number;
}

@Injectable()
export class PeopleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreatePersonDto) {
    return this.prisma.person.create({
      data: {
        fullName: data.fullName,
        dateOfBirth: new Date(data.dateOfBirth),
        email: data.email,
        phone: data.phone ?? null,
        address: data.address ?? null,
      },
    });
  }

  async findById(id: string) {
    const person = await this.prisma.person.findUnique({
      where: { id },
    });
    if (!person) {
      throw new NotFoundException(`Person with id "${id}" not found`);
    }
    return person;
  }

  async findMany(params: PaginationParams) {
    const { page, pageSize } = params;
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.person.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.person.count(),
    ]);

    return { data, total };
  }

  async update(id: string, data: UpdatePersonDto) {
    // Ensure the person exists first
    await this.findById(id);

    const updateData: Record<string, unknown> = {};
    if (data.fullName !== undefined) updateData.fullName = data.fullName;
    if (data.dateOfBirth !== undefined) updateData.dateOfBirth = new Date(data.dateOfBirth);
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.address !== undefined) updateData.address = data.address;

    return this.prisma.person.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string) {
    // Check if person has employees linked
    const person = await this.prisma.person.findUnique({
      where: { id },
      include: { employees: { select: { id: true } } },
    });

    if (!person) {
      throw new NotFoundException(`Person with id "${id}" not found`);
    }

    if (person.employees.length > 0) {
      return { canDelete: false, employees: person.employees };
    }

    await this.prisma.person.delete({ where: { id } });
    return { canDelete: true, employees: [] };
  }
}
