import { NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit.service';

describe('AuditService', () => {
  let service: AuditService;
  let mockPrisma: any;

  const mockAuditRecord = {
    id: 'audit-1',
    userId: 'user-1',
    entityType: 'Person',
    entityId: 'person-1',
    operation: 'CREATE',
    diff: { after: { fullName: 'John Doe' } },
    timestamp: new Date('2024-01-15T10:00:00.000Z'),
  };

  const mockAuditRecords = [
    mockAuditRecord,
    {
      id: 'audit-2',
      userId: 'user-1',
      entityType: 'Employee',
      entityId: 'emp-1',
      operation: 'UPDATE',
      diff: { before: { status: 'ACTIVE' }, after: { status: 'ON_LEAVE' } },
      timestamp: new Date('2024-01-14T10:00:00.000Z'),
    },
    {
      id: 'audit-3',
      userId: 'user-2',
      entityType: 'Person',
      entityId: 'person-2',
      operation: 'DELETE',
      diff: { before: { fullName: 'Jane Doe' } },
      timestamp: new Date('2024-01-13T10:00:00.000Z'),
    },
  ];

  beforeEach(() => {
    mockPrisma = {
      auditRecord: {
        create: jest.fn().mockResolvedValue(mockAuditRecord),
        findMany: jest.fn().mockResolvedValue(mockAuditRecords),
        findUnique: jest.fn().mockResolvedValue(mockAuditRecord),
        count: jest.fn().mockResolvedValue(3),
      },
    };

    service = new AuditService(mockPrisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an audit record', async () => {
      const result = await service.create(
        'user-1',
        'Person',
        'person-1',
        'CREATE',
        { after: { fullName: 'John Doe' } },
      );

      expect(result).toEqual(mockAuditRecord);
      expect(mockPrisma.auditRecord.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          entityType: 'Person',
          entityId: 'person-1',
          operation: 'CREATE',
          diff: { after: { fullName: 'John Doe' } },
        },
      });
    });

    it('should serialize diff to avoid circular references', async () => {
      const diff = { after: { date: new Date('2024-01-01') } };

      await service.create('user-1', 'Person', 'person-1', 'CREATE', diff);

      expect(mockPrisma.auditRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          diff: { after: { date: '2024-01-01T00:00:00.000Z' } },
        }),
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated results with default params', async () => {
      const result = await service.findAll();

      expect(result).toEqual({
        data: mockAuditRecords,
        meta: {
          page: 1,
          pageSize: 50,
          total: 3,
          totalPages: 1,
        },
      });
      expect(mockPrisma.auditRecord.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { timestamp: 'desc' },
        skip: 0,
        take: 50,
      });
    });

    it('should support custom page and pageSize', async () => {
      mockPrisma.auditRecord.count.mockResolvedValue(150);

      const result = await service.findAll({ page: 2, pageSize: 25 });

      expect(result.meta).toEqual({
        page: 2,
        pageSize: 25,
        total: 150,
        totalPages: 6,
      });
      expect(mockPrisma.auditRecord.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { timestamp: 'desc' },
        skip: 25,
        take: 25,
      });
    });

    it('should cap pageSize at 100', async () => {
      await service.findAll({ pageSize: 200 });

      expect(mockPrisma.auditRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });

    it('should clamp page to minimum of 1', async () => {
      await service.findAll({ page: 0 });

      expect(mockPrisma.auditRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0 }),
      );
    });

    it('should clamp pageSize to minimum of 1', async () => {
      await service.findAll({ pageSize: 0 });

      expect(mockPrisma.auditRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 1 }),
      );
    });

    it('should filter by entityType', async () => {
      await service.findAll({ entityType: 'Person' });

      expect(mockPrisma.auditRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { entityType: 'Person' },
        }),
      );
    });

    it('should filter by entityId', async () => {
      await service.findAll({ entityId: 'person-1' });

      expect(mockPrisma.auditRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { entityId: 'person-1' },
        }),
      );
    });

    it('should filter by userId', async () => {
      await service.findAll({ userId: 'user-1' });

      expect(mockPrisma.auditRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
        }),
      );
    });

    it('should filter by startDate (gte)', async () => {
      const startDate = new Date('2024-01-14T00:00:00.000Z');

      await service.findAll({ startDate });

      expect(mockPrisma.auditRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { timestamp: { gte: startDate } },
        }),
      );
    });

    it('should filter by endDate (lte)', async () => {
      const endDate = new Date('2024-01-15T23:59:59.000Z');

      await service.findAll({ endDate });

      expect(mockPrisma.auditRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { timestamp: { lte: endDate } },
        }),
      );
    });

    it('should filter by date range (startDate and endDate)', async () => {
      const startDate = new Date('2024-01-13T00:00:00.000Z');
      const endDate = new Date('2024-01-15T23:59:59.000Z');

      await service.findAll({ startDate, endDate });

      expect(mockPrisma.auditRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { timestamp: { gte: startDate, lte: endDate } },
        }),
      );
    });

    it('should combine multiple filters', async () => {
      const startDate = new Date('2024-01-14T00:00:00.000Z');

      await service.findAll({
        entityType: 'Person',
        userId: 'user-1',
        startDate,
      });

      expect(mockPrisma.auditRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            entityType: 'Person',
            userId: 'user-1',
            timestamp: { gte: startDate },
          },
        }),
      );
    });

    it('should order by timestamp descending', async () => {
      await service.findAll();

      expect(mockPrisma.auditRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { timestamp: 'desc' },
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return an audit record by id', async () => {
      const result = await service.findById('audit-1');

      expect(result).toEqual(mockAuditRecord);
      expect(mockPrisma.auditRecord.findUnique).toHaveBeenCalledWith({
        where: { id: 'audit-1' },
      });
    });

    it('should throw NotFoundException when record does not exist', async () => {
      mockPrisma.auditRecord.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findById('nonexistent')).rejects.toThrow(
        'Audit record with id "nonexistent" not found',
      );
    });
  });
});
