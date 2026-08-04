import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { AuthorizationGuard } from '../authorization.guard';
import { RequireFeaturePermission } from '../authorization.decorator';
import { RolesService } from './roles.service';
import { CreateRoleSchema } from './dto/create-role.dto';
import { UpdateRoleSchema } from './dto/update-role.dto';
import { AssignPermissionSchema } from './dto/assign-permission.dto';
import { BulkPermissionsSchema } from './dto/bulk-permissions.dto';
import { AssignRoleSchema } from './dto/assign-role.dto';

@Controller('api/v2/companies/:companyId')
@UseGuards(AuthorizationGuard)
@RequireFeaturePermission('authorization', 'manage_roles')
export class RolesController {
  constructor(private readonly service: RolesService) {}

  // ─── Role CRUD ────────────────────────────────────────────────────────────

  @Post('roles')
  async create(
    @Param('companyId') companyId: string,
    @Body() body: unknown,
  ) {
    const parsed = CreateRoleSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.service.create(companyId, parsed.data);
  }

  @Get('roles')
  async findAll(@Param('companyId') companyId: string) {
    return this.service.findAll(companyId);
  }

  @Get('roles/:id')
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }

  @Patch('roles/:id')
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = UpdateRoleSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.service.update(companyId, id, parsed.data);
  }

  @Post('roles/:id/duplicate')
  @HttpCode(HttpStatus.OK)
  async duplicate(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.duplicate(companyId, id);
  }

  @Post('roles/:id/archive')
  @HttpCode(HttpStatus.OK)
  async archive(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.archive(companyId, id);
  }

  @Delete('roles/:id')
  @HttpCode(HttpStatus.OK)
  async delete(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.delete(companyId, id);
  }

  // ─── Permission Assignment ──────────────────────────────────────────────────

  @Post('roles/:id/permissions')
  async addPermission(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = AssignPermissionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.service.addPermission(companyId, id, parsed.data);
  }

  @Delete('roles/:id/permissions/:permId')
  @HttpCode(HttpStatus.OK)
  async removePermission(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Param('permId') permId: string,
  ) {
    return this.service.removePermission(companyId, id, permId);
  }

  @Post('roles/:id/permissions/bulk')
  @HttpCode(HttpStatus.OK)
  async bulkPermissions(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = BulkPermissionsSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.service.bulkPermissions(companyId, id, parsed.data);
  }

  // ─── User Role Assignment ──────────────────────────────────────────────────

  @Post('users/:userId/roles')
  async assignRole(
    @Param('companyId') companyId: string,
    @Param('userId') userId: string,
    @Body() body: unknown,
  ) {
    const parsed = AssignRoleSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    return this.service.assignRoleToUser(companyId, userId, parsed.data);
  }

  @Get('users/:userId/roles')
  async getUserRoles(
    @Param('companyId') companyId: string,
    @Param('userId') userId: string,
  ) {
    return this.service.getUserRoles(companyId, userId);
  }

  @Delete('users/:userId/roles/:roleId')
  @HttpCode(HttpStatus.OK)
  async removeRole(
    @Param('companyId') companyId: string,
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.service.removeRoleFromUser(companyId, userId, roleId);
  }

  @Get('users/:userId/effective-permissions')
  async getEffectivePermissions(
    @Param('companyId') companyId: string,
    @Param('userId') userId: string,
  ) {
    return this.service.getEffectivePermissions(companyId, userId);
  }
}
