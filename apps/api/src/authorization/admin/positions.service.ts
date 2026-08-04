import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';

@Injectable()
export class PositionsService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(companyId: string, dto: CreatePositionDto) {
    // Check unique name within company
    const existing = await this.prisma.positionV2.findUnique({
      where: { companyId_name: { companyId, name: dto.name } },
    });
    if (existing) {
      throw new ConflictException(
        `Position with name "${dto.name}" already exists`,
      );
    }

    return this.prisma.positionV2.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description,
        careerLevel: dto.careerLevel,
        canHaveDirectReports: dto.canHaveDirectReports ?? false,
      },
    });
  }

  async findAll(companyId: string) {
    return this.prisma.positionV2.findMany({
      where: { companyId, archivedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async update(companyId: string, id: string, dto: UpdatePositionDto) {
    const position = await this.prisma.positionV2.findFirst({
      where: { id, companyId },
    });
    if (!position) {
      throw new NotFoundException('Position not found');
    }

    // Check unique name if being changed
    if (dto.name) {
      const existing = await this.prisma.positionV2.findFirst({
        where: { companyId, name: dto.name, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(
          `Position with name "${dto.name}" already exists`,
        );
      }
    }

    return this.prisma.positionV2.update({
      where: { id },
      data: dto,
    });
  }

  async archive(companyId: string, id: string) {
    const position = await this.prisma.positionV2.findFirst({
      where: { id, companyId },
    });
    if (!position) {
      throw new NotFoundException('Position not found');
    }
    if (position.archivedAt) {
      throw new BadRequestException('Position is already archived');
    }
    return this.prisma.positionV2.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
  }

  async delete(companyId: string, id: string) {
    const position = await this.prisma.positionV2.findFirst({
      where: { id, companyId },
    });
    if (!position) {
      throw new NotFoundException('Position not found');
    }

    // Check if position is assigned to any user
    const assignedCount = await this.prisma.userCompanyMembership.count({
      where: { positionId: id, companyId },
    });
    if (assignedCount > 0) {
      throw new BadRequestException(
        'Cannot delete position: it is currently assigned to users',
      );
    }

    await this.prisma.positionV2.delete({ where: { id } });
    return { deleted: true };
  }
}
