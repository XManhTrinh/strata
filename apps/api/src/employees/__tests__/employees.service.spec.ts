import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EmployeesService } from '../employees.service';
import { EmployeesDomain } from '../employees.domain';
import { EmployeesRepository } from '../employees.repository';

describe('EmployeesService', () => {
  let service: EmployeesService;
  let domain: EmployeesDomain;
  let repository: jest.Mocked<EmployeesRepository>;
  let mockPrisma: any;

  const mockEmployee: any = {
    id: 'emp-1',
    uin: 'EMP-000001',
    personId: 'person-1',
    organizationId: 'org-1',
    departmentId: 'dept-1',
    positionId: 'pos-1',
    startDate: new Date('2024-01-01T00:00:00.000Z'),
    endDate: null,
    status: 'ACTIVE',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    domain = new EmployeesDomain();

    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      countByOrganization: jest.fn(),
    } as any;

    mockPrisma = {
      person: {
        findUnique: jest.fn(),
      },
      organization: {
        findUnique: jest.fn(),
      },
      auditRecord: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    service = new EmployeesService(domain, repository, mockPrisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const validPayload = {
      personId: 'person-1',
      organizationId: 'org-1',
      departmentId: 'dept-1',
      positionId: 'pos-1',
      startDate: '2024-01-01T00:00:00.000Z',
    };

    it('should create an employee with auto-generated UIN', async () => {
      mockPrisma.person.findUnique.mockResolvedValue({ id: 'person-1' });
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org-1' });
      repository.countByOrganization.mockResolvedValue(0);
      repository.create.mockResolvedValue(mockEmployee);

      const result = await service.create(validPayload, 'user-1');

      expect(result).toEqual(mockEmployee);
      expect(repository.create).toHaveBeenCalledWith({
        ...validPayload,
        uin: 'EMP-000001',
      });
    });

    it('should generate sequential UINs per organization', async () => {
      mockPrisma.person.findUnique.mockResolvedValue({ id: 'person-1' });
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org-1' });
      repository.countByOrganization.mockResolvedValue(5);
      repository.create.mockResolvedValue({ ...mockEmployee, uin: 'EMP-000006' });

      await service.create(validPayload, 'user-1');

      expect(repository.create).toHaveBeenCalledWith({
        ...validPayload,
        uin: 'EMP-000006',
      });
    });

    it('should reject creation if personId does not exist', async () => {
      mockPrisma.person.findUnique.mockResolvedValue(null);

      await expect(service.create(validPayload, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should reject creation if organizationId does not exist', async () => {
      mockPrisma.person.findUnique.mockResolvedValue({ id: 'person-1' });
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      await expect(service.create(validPayload, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should create an audit record on create', async () => {
      mockPrisma.person.findUnique.mockResolvedValue({ id: 'person-1' });
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org-1' });
      repository.countByOrganization.mockResolvedValue(0);
      repository.create.mockResolvedValue(mockEmployee);

      await service.create(validPayload, 'user-1');

      expect(mockPrisma.auditRecord.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          entityType: 'Employee',
          entityId: 'emp-1',
          operation: 'CREATE',
          diff: { after: JSON.parse(JSON.stringify(mockEmployee)) },
        },
      });
    });

    it('should reject creation with invalid payload', async () => {
      await expect(service.create({}, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated results with default params', async () => {
      repository.findMany.mockResolvedValue({
        data: [mockEmployee],
        total: 1,
      });

      const result = await service.findAll({});

      expect(result).toEqual({
        data: [mockEmployee],
        meta: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      });
    });

    it('should pass filter params to repository', async () => {
      repository.findMany.mockResolvedValue({ data: [], total: 0 });

      await service.findAll({
        departmentId: 'dept-1',
        status: 'ACTIVE',
        page: 2,
        pageSize: 10,
      });

      expect(repository.findMany).toHaveBeenCalledWith({
        page: 2,
        pageSize: 10,
        departmentId: 'dept-1',
        positionId: undefined,
        status: 'ACTIVE',
        startDateGte: undefined,
        endDateLte: undefined,
      });
    });
  });

  describe('update', () => {
    it('should update an employee', async () => {
      const updatePayload = { departmentId: 'dept-2' };
      const updatedEmployee = { ...mockEmployee, departmentId: 'dept-2' };
      repository.findById.mockResolvedValue(mockEmployee);
      repository.update.mockResolvedValue(updatedEmployee);

      const result = await service.update('emp-1', updatePayload, 'user-1');

      expect(result).toEqual(updatedEmployee);
    });

    it('should reject update if UIN is in payload (immutability)', async () => {
      const payloadWithUin = { uin: 'EMP-999999', departmentId: 'dept-2' };

      await expect(
        service.update('emp-1', payloadWithUin, 'user-1'),
      ).rejects.toThrow(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('should create an audit record on update', async () => {
      const updatePayload = { departmentId: 'dept-2' };
      const updatedEmployee = { ...mockEmployee, departmentId: 'dept-2' };
      repository.findById.mockResolvedValue(mockEmployee);
      repository.update.mockResolvedValue(updatedEmployee);

      await service.update('emp-1', updatePayload, 'user-1');

      expect(mockPrisma.auditRecord.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          entityType: 'Employee',
          entityId: 'emp-1',
          operation: 'UPDATE',
          diff: {
            before: JSON.parse(JSON.stringify(mockEmployee)),
            after: JSON.parse(JSON.stringify(updatedEmployee)),
          },
        },
      });
    });
  });

  describe('transitionStatus', () => {
    it('should transition from ACTIVE to ON_LEAVE', async () => {
      const updatedEmployee = { ...mockEmployee, status: 'ON_LEAVE' };
      repository.findById.mockResolvedValue(mockEmployee);
      repository.updateStatus.mockResolvedValue(updatedEmployee);

      const result = await service.transitionStatus(
        'emp-1',
        { status: 'ON_LEAVE' },
        'user-1',
      );

      expect(result.status).toBe('ON_LEAVE');
      expect(repository.updateStatus).toHaveBeenCalledWith('emp-1', 'ON_LEAVE', undefined);
    });

    it('should set endDate when transitioning to TERMINATED', async () => {
      const updatedEmployee = { ...mockEmployee, status: 'TERMINATED', endDate: new Date() };
      repository.findById.mockResolvedValue(mockEmployee);
      repository.updateStatus.mockResolvedValue(updatedEmployee);

      await service.transitionStatus('emp-1', { status: 'TERMINATED' }, 'user-1');

      expect(repository.updateStatus).toHaveBeenCalledWith(
        'emp-1',
        'TERMINATED',
        expect.any(Date),
      );
    });

    it('should reject invalid transitions', async () => {
      const terminatedEmployee = { ...mockEmployee, status: 'TERMINATED' };
      repository.findById.mockResolvedValue(terminatedEmployee);

      await expect(
        service.transitionStatus('emp-1', { status: 'ACTIVE' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create an audit record on status transition', async () => {
      const updatedEmployee = { ...mockEmployee, status: 'SUSPENDED' };
      repository.findById.mockResolvedValue(mockEmployee);
      repository.updateStatus.mockResolvedValue(updatedEmployee);

      await service.transitionStatus('emp-1', { status: 'SUSPENDED' }, 'user-1');

      expect(mockPrisma.auditRecord.create).toHaveBeenCalled();
    });
  });

  describe('delete (soft delete)', () => {
    it('should soft delete by setting status to TERMINATED', async () => {
      const terminatedEmployee = { ...mockEmployee, status: 'TERMINATED', endDate: new Date() };
      repository.findById.mockResolvedValue(mockEmployee);
      repository.updateStatus.mockResolvedValue(terminatedEmployee);

      const result = await service.delete('emp-1', 'user-1');

      expect(result.status).toBe('TERMINATED');
      expect(repository.updateStatus).toHaveBeenCalledWith(
        'emp-1',
        'TERMINATED',
        expect.any(Date),
      );
    });

    it('should reject deletion if already terminated', async () => {
      const terminatedEmployee = { ...mockEmployee, status: 'TERMINATED' };
      repository.findById.mockResolvedValue(terminatedEmployee);

      await expect(service.delete('emp-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create an audit record on soft delete', async () => {
      const terminatedEmployee = { ...mockEmployee, status: 'TERMINATED', endDate: new Date() };
      repository.findById.mockResolvedValue(mockEmployee);
      repository.updateStatus.mockResolvedValue(terminatedEmployee);

      await service.delete('emp-1', 'user-1');

      expect(mockPrisma.auditRecord.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          entityType: 'Employee',
          entityId: 'emp-1',
          operation: 'UPDATE',
          diff: {
            before: JSON.parse(JSON.stringify(mockEmployee)),
            after: JSON.parse(JSON.stringify(terminatedEmployee)),
          },
        },
      });
    });

    it('should propagate NotFoundException if employee does not exist', async () => {
      repository.findById.mockRejectedValue(
        new NotFoundException('Employee with id "nonexistent" not found'),
      );

      await expect(service.delete('nonexistent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
