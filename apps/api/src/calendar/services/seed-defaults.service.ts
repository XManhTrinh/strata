import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@strata/database';

const DEFAULT_EVENT_TYPES = [
  { name: 'Leave', color: '#10B981', description: 'Time off / leave requests' },
  { name: 'Conference', color: '#8B5CF6', description: 'Conferences and summits' },
  { name: 'Sick Leave', color: '#EF4444', description: 'Sick days' },
  { name: 'Training', color: '#F59E0B', description: 'Training and development' },
  { name: 'Meeting', color: '#3B82F6', description: 'Meetings' },
  { name: 'Out of Office', color: '#6B7280', description: 'Out of office' },
  { name: 'Work From Home', color: '#06B6D4', description: 'Working remotely' },
];

const DEFAULT_LEAVE_TYPES = [
  { name: 'Annual', color: '#10B981', defaultAllocation: 25, requiresApproval: true, carryOver: true, maxCarryOverDays: 5 },
  { name: 'Sick', color: '#EF4444', defaultAllocation: 10, requiresApproval: false, carryOver: false },
  { name: 'Conference', color: '#8B5CF6', defaultAllocation: 5, requiresApproval: true, carryOver: false },
  { name: 'Training', color: '#F59E0B', defaultAllocation: 5, requiresApproval: true, carryOver: false },
  { name: 'Personal', color: '#EC4899', defaultAllocation: 3, requiresApproval: true, carryOver: false },
  { name: 'Parental', color: '#14B8A6', defaultAllocation: 90, requiresApproval: true, carryOver: false },
  { name: 'Unpaid', color: '#6B7280', defaultAllocation: 0, requiresApproval: true, carryOver: false },
];

@Injectable()
export class SeedDefaultsService {
  private readonly logger = new Logger(SeedDefaultsService.name);

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Seeds default EventTypes and LeaveTypes for a company when the calendar feature is enabled.
   * Uses isSystem=true to mark these as platform defaults.
   * Skips types that already exist (based on name uniqueness).
   */
  async seedDefaults(companyId: string): Promise<{ eventTypesCreated: number; leaveTypesCreated: number }> {
    let eventTypesCreated = 0;
    let leaveTypesCreated = 0;

    // Seed Event Types
    for (const et of DEFAULT_EVENT_TYPES) {
      try {
        await this.prisma.eventType.create({
          data: {
            companyId,
            name: et.name,
            color: et.color,
            description: et.description,
            isSystem: true,
          },
        });
        eventTypesCreated++;
      } catch (error: any) {
        // P2002 = unique constraint violation (already exists)
        if (error.code !== 'P2002') {
          this.logger.warn(`Failed to seed event type '${et.name}': ${error.message}`);
        }
      }
    }

    // Seed Leave Types
    for (const lt of DEFAULT_LEAVE_TYPES) {
      try {
        await this.prisma.leaveTypeConfig.create({
          data: {
            companyId,
            name: lt.name,
            color: lt.color,
            defaultAllocation: lt.defaultAllocation,
            requiresApproval: lt.requiresApproval,
            carryOver: lt.carryOver,
            maxCarryOverDays: lt.maxCarryOverDays ?? null,
            isSystem: true,
          },
        });
        leaveTypesCreated++;
      } catch (error: any) {
        if (error.code !== 'P2002') {
          this.logger.warn(`Failed to seed leave type '${lt.name}': ${error.message}`);
        }
      }
    }

    this.logger.log(
      `Seeded defaults for company ${companyId}: ${eventTypesCreated} event types, ${leaveTypesCreated} leave types`,
    );

    return { eventTypesCreated, leaveTypesCreated };
  }
}
