import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { CreateRoleSchema } from './dto/create-role.dto';
import { UpdateRoleSchema } from './dto/update-role.dto';
import { AssignRoleSchema } from './dto/assign-role.dto';
import { CreatePermissionSchema } from './dto/create-permission.dto';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  // ─── Role CRUD ──────────────────────────────────────────────────────────────

  @Post('roles')
  async createRole(@Body() body: unknown) {
    const result = CreateRoleSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    return this.permissionsService.createRole(result.data);
  }

  @Get('roles')
  async listRoles() {
    return this.permissionsService.listRoles();
  }

  @Get('roles/:id')
  async getRole(@Param('id') id: string) {
    return this.permissionsService.getRole(id);
  }

  @Put('roles/:id')
  async updateRole(@Param('id') id: string, @Body() body: unknown) {
    const result = UpdateRoleSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    return this.permissionsService.updateRole(id, result.data);
  }

  @Delete('roles/:id')
  @HttpCode(HttpStatus.OK)
  async deleteRole(@Param('id') id: string) {
    return this.permissionsService.deleteRole(id);
  }

  // ─── Permission Management ──────────────────────────────────────────────────

  @Post('roles/:roleId/permissions')
  async addPermissionToRole(
    @Param('roleId') roleId: string,
    @Body() body: unknown,
  ) {
    const result = CreatePermissionSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    return this.permissionsService.addPermissionToRole(roleId, result.data);
  }

  @Delete('roles/:roleId/permissions/:permissionId')
  @HttpCode(HttpStatus.OK)
  async removePermissionFromRole(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.permissionsService.removePermissionFromRole(roleId, permissionId);
  }

  // ─── Role Assignments ───────────────────────────────────────────────────────

  @Post('assignments')
  async assignRole(@Body() body: unknown) {
    const result = AssignRoleSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    return this.permissionsService.assignRole(result.data);
  }

  @Delete('assignments/:id')
  @HttpCode(HttpStatus.OK)
  async removeAssignment(@Param('id') id: string) {
    return this.permissionsService.removeAssignment(id);
  }

  @Get('assignments/user/:userId')
  async getUserAssignments(@Param('userId') userId: string) {
    return this.permissionsService.getUserAssignments(userId);
  }
}
