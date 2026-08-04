import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import { CreateOrgUnitTypeDto } from './dto/create-org-unit-type.dto';
import { UpdateOrgUnitTypeDto } from './dto/update-org-unit-type.dto';

@Injectable()
export class OrgUnitTypesService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(companyId: string, dto: CreateOrgUnitTypeDto) {
    // Check unique name within company
    const existing = await this.prisma.organizationUnitType.findUnique({
      where: { companyId_name: { companyId, name: dto.name } },
    });
    if (existing) {
      throw new ConflictException(
        `Organization unit type with name "${dto.name}" already exists`,
      );
    }

    return this.prisma.organizationUnitType.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        color: dto.color,
        displayOrder: dto.displayOrder ?? 0,
      },
    });
  }

  async findAll(companyId: string, archived?: boolean) {
    const where: any = { companyId };
    if (archived === true) {
      where.archivedAt = { not: null };
    } else if (archived === false) {
      where.archivedAt = null;
    }

    return this.prisma.organizationUnitType.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const type = await this.prisma.organizationUnitType.findFirst({
      where: { id, companyId },
    });
    if (!type) {
      throw new NotFoundException('Organization unit type not found');
    }
    return type;
  }

  async update(companyId: string, id: string, dto: UpdateOrgUnitTypeDto) {
    await this.findOne(companyId, id);

    // If name is being changed, check uniqueness
    if (dto.name) {
      const existing = await this.prisma.organizationUnitType.findFirst({
        where: { companyId, name: dto.name, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(
          `Organization unit type with name "${dto.name}" already exists`,
        );
      }
    }

    return this.prisma.organizationUnitType.update({
      where: { id },
      data: dto,
    });
  }

  async archive(companyId: string, id: string) {
    const type = await this.findOne(companyId, id);
    if (type.archivedAt) {
      throw new BadRequestException('Organization unit type is already archived');
    }
    return this.prisma.organizationUnitType.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
  }

  async restore(companyId: string, id: string) {
    const type = await this.findOne(companyId, id);
    if (!type.archivedAt) {
      throw new BadRequestException('Organization unit type is not archived');
    }
    return this.prisma.organizationUnitType.update({
      where: { id },
      data: { archivedAt: null },
    });
  }
}
