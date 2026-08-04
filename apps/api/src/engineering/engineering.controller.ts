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
import { EngineeringService } from './engineering.service';

@Controller('engineering')
export class EngineeringController {
  constructor(private readonly engineeringService: EngineeringService) {}

  // ─── Tribe Endpoints ──────────────────────────────────────────────────────

  @Post('tribes')
  async createTribe(@Body() body: unknown, @Req() req: Request) {
    const userId = (req as any).user?.sub;
    return this.engineeringService.createTribe(body, userId);
  }

  @Get('tribes')
  async findAllTribes(@Query('organizationId') organizationId?: string) {
    return this.engineeringService.findAllTribes(organizationId);
  }

  @Get('tribes/:id')
  async findTribeById(@Param('id') id: string) {
    return this.engineeringService.findTribeById(id);
  }

  @Put('tribes/:id')
  async updateTribe(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.sub;
    return this.engineeringService.updateTribe(id, body, userId);
  }

  @Delete('tribes/:id')
  @HttpCode(HttpStatus.OK)
  async deleteTribe(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.sub;
    return this.engineeringService.deleteTribe(id, userId);
  }

  // ─── Cluster Endpoints ────────────────────────────────────────────────────

  @Post('clusters')
  async createCluster(@Body() body: unknown, @Req() req: Request) {
    const userId = (req as any).user?.sub;
    return this.engineeringService.createCluster(body, userId);
  }

  @Get('clusters')
  async findAllClusters(@Query('tribeId') tribeId?: string) {
    return this.engineeringService.findAllClusters(tribeId);
  }

  @Get('clusters/:id')
  async findClusterById(@Param('id') id: string) {
    return this.engineeringService.findClusterById(id);
  }

  @Put('clusters/:id')
  async updateCluster(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.sub;
    return this.engineeringService.updateCluster(id, body, userId);
  }

  @Delete('clusters/:id')
  @HttpCode(HttpStatus.OK)
  async deleteCluster(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.sub;
    return this.engineeringService.deleteCluster(id, userId);
  }

  // ─── Squad Endpoints ──────────────────────────────────────────────────────

  @Post('squads')
  async createSquad(@Body() body: unknown, @Req() req: Request) {
    const userId = (req as any).user?.sub;
    return this.engineeringService.createSquad(body, userId);
  }

  @Get('squads')
  async findAllSquads(@Query('clusterId') clusterId?: string) {
    return this.engineeringService.findAllSquads(clusterId);
  }

  @Get('squads/:id')
  async findSquadById(@Param('id') id: string) {
    return this.engineeringService.findSquadById(id);
  }

  @Put('squads/:id')
  async updateSquad(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.sub;
    return this.engineeringService.updateSquad(id, body, userId);
  }

  @Delete('squads/:id')
  @HttpCode(HttpStatus.OK)
  async deleteSquad(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.sub;
    return this.engineeringService.deleteSquad(id, userId);
  }

  // ─── Team Membership Endpoints ────────────────────────────────────────────

  @Post('memberships')
  async createTeamMembership(@Body() body: unknown, @Req() req: Request) {
    const userId = (req as any).user?.sub;
    return this.engineeringService.createTeamMembership(body, userId);
  }

  @Get('memberships')
  async findAllTeamMemberships(
    @Query('employeeId') employeeId?: string,
    @Query('squadId') squadId?: string,
  ) {
    return this.engineeringService.findAllTeamMemberships(employeeId, squadId);
  }

  @Delete('memberships/:id')
  @HttpCode(HttpStatus.OK)
  async deleteTeamMembership(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.sub;
    return this.engineeringService.deleteTeamMembership(id, userId);
  }
}
