import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import { CreateCareerLevelDto } from './dto/create-career-level.dto';
import { UpdateCareerLevelDto } from './dto/update-career-level.dto';

@Injectable()
export class CareerLevelsService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Get the career level scheme for a company, including all levels.
   * Auto-creates the scheme if it doesn't exist.
   */
  async getScheme(companyId: string) {
    let scheme = await this.prisma.careerLevelScheme.findUnique({
      where: { companyId },
      include: { levels: { orderBy: { rank: 'asc' } } },
    });

    if (!scheme) {
      scheme = await this.prisma.careerLevelScheme.create({
        data: { companyId, type: 'numeric' },
        include: { levels: { orderBy: { rank: 'asc' } } },
      });
    }

    return scheme;
  }

  /**
   * Create a new career level within the company's scheme.
   */
  async create(companyId: string, dto: CreateCareerLevelDto) {
    const scheme = await this.getScheme(companyId);

    // Check unique label within scheme
    const existing = scheme.levels.find(
      (l) => l.label.toLowerCase() === dto.label.toLowerCase(),
    );
    if (existing) {
      throw new ConflictException(
        `Career level with label "${dto.label}" already exists`,
      );
    }

    return this.prisma.careerLevel.create({
      data: {
        schemeId: scheme.id,
        label: dto.label,
        displayName: dto.displayName,
        rank: dto.rank,
        track: dto.track,
      },
    });
  }

  /**
   * Update an existing career level.
   */
  async update(companyId: string, levelId: string, dto: UpdateCareerLevelDto) {
    const scheme = await this.getScheme(companyId);
    const level = scheme.levels.find((l) => l.id === levelId);

    if (!level) {
      throw new NotFoundException('Career level not found');
    }

    // Check unique label if being changed
    if (dto.label) {
      const conflict = scheme.levels.find(
        (l) =>
          l.id !== levelId &&
          l.label.toLowerCase() === dto.label!.toLowerCase(),
      );
      if (conflict) {
        throw new ConflictException(
          `Career level with label "${dto.label}" already exists`,
        );
      }
    }

    return this.prisma.careerLevel.update({
      where: { id: levelId },
      data: dto,
    });
  }

  /**
   * Delete a career level. Fails if it's assigned to any position or user.
   */
  async delete(companyId: string, levelId: string) {
    const scheme = await this.getScheme(companyId);
    const level = scheme.levels.find((l) => l.id === levelId);

    if (!level) {
      throw new NotFoundException('Career level not found');
    }

    // Check if level is in use by positions or users
    const [positionCount, membershipCount] = await Promise.all([
      this.prisma.position.count({
        where: {
          OR: [
            { careerLevelId: levelId },
            { minLevelId: levelId },
            { maxLevelId: levelId },
          ],
        },
      }),
      this.prisma.userCompanyMembership.count({
        where: { careerLevelId: levelId },
      }),
    ]);

    if (positionCount > 0 || membershipCount > 0) {
      throw new ConflictException(
        'Cannot delete career level: it is currently assigned to positions or users',
      );
    }

    await this.prisma.careerLevel.delete({ where: { id: levelId } });
    return { deleted: true };
  }
}
