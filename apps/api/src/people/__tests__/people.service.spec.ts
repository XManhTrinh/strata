import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PeopleService } from '../people.service';
import { PeopleDomain } from '../people.domain';
import { PeopleRepository } from '../people.repository';

describe('PeopleService', () => {
  let service: PeopleService;
  let domain: PeopleDomain;
  let repository: jest.Mocked<PeopleRepository>;
  let mockPrisma: any;

  const mockPerson = {
    id: 'person-1',
    fullName: 'John Doe',
    dateOfBirth: new Date('1990-01-15T00:00:00.000Z'),
    email: 'john@example.com',
    phone: '+1234567890',
    address: '123 Main St',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    domain = new PeopleDomain();

    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockPrisma = {
      auditRecord: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    service = new PeopleService(domain, repository, mockPrisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const validPayload = {
      fullName: 'John Doe',
      dateOfBirth: '1990-01-15T00:00:00.000Z',
      email: 'john@example.com',
      phone: '+1234567890',
      address: '123 Main St',
    };

    it('should create a person with valid data', async () => {
      repository.create.mockResolvedValue(mockPerson);

      const result = await service.create(validPayload, 'user-1');

      expect(result).toEqual(mockPerson);
      expect(repository.create).toHaveBeenCalledWith({
        fullName: 'John Doe',
        dateOfBirth: '1990-01-15T00:00:00.000Z',
        email: 'john@example.com',
        phone: '+1234567890',
        address: '123 Main St',
      });
    });

    it('should create an audit record on create', async () => {
      repository.create.mockResolvedValue(mockPerson);

      await service.create(validPayload, 'user-1');

      expect(mockPrisma.auditRecord.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          entityType: 'Person',
          entityId: 'person-1',
          operation: 'CREATE',
          diff: { after: JSON.parse(JSON.stringify(mockPerson)) },
        },
      });
    });

    it('should reject creation with missing required fields', async () => {
      const invalidPayload = {
        email: 'john@example.com',
      };

      await expect(service.create(invalidPayload, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should reject creation with invalid email', async () => {
      const invalidPayload = {
        fullName: 'John Doe',
        dateOfBirth: '1990-01-15T00:00:00.000Z',
        email: 'not-an-email',
      };

      await expect(service.create(invalidPayload, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject creation with unknown fields', async () => {
      const payloadWithUnknown = {
        ...validPayload,
        unknownField: 'should be rejected',
      };

      await expect(service.create(payloadWithUnknown, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated results with default params', async () => {
      repository.findMany.mockResolvedValue({
        data: [mockPerson],
        total: 1,
      });

      const result = await service.findAll();

      expect(result).toEqual({
        data: [mockPerson],
        meta: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      });
      expect(repository.findMany).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
      });
    });

    it('should support custom pagination params', async () => {
      repository.findMany.mockResolvedValue({
        data: [],
        total: 50,
      });

      const result = await service.findAll(3, 10);

      expect(result.meta).toEqual({
        page: 3,
        pageSize: 10,
        total: 50,
        totalPages: 5,
      });
    });

    it('should clamp page to minimum of 1', async () => {
      repository.findMany.mockResolvedValue({
        data: [],
        total: 0,
      });

      await service.findAll(0, 20);

      expect(repository.findMany).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
      });
    });

    it('should clamp pageSize to maximum of 100', async () => {
      repository.findMany.mockResolvedValue({
        data: [],
        total: 0,
      });

      await service.findAll(1, 200);

      expect(repository.findMany).toHaveBeenCalledWith({
        page: 1,
        pageSize: 100,
      });
    });
  });

  describe('findById', () => {
    it('should return a person by id', async () => {
      repository.findById.mockResolvedValue(mockPerson);

      const result = await service.findById('person-1');

      expect(result).toEqual(mockPerson);
      expect(repository.findById).toHaveBeenCalledWith('person-1');
    });

    it('should propagate NotFoundException from repository', async () => {
      repository.findById.mockRejectedValue(
        new NotFoundException('Person with id "nonexistent" not found'),
      );

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updatePayload = {
      fullName: 'Jane Doe',
      email: 'jane@example.com',
    };

    const updatedPerson = {
      ...mockPerson,
      fullName: 'Jane Doe',
      email: 'jane@example.com',
    };

    it('should update a person with valid data', async () => {
      repository.findById.mockResolvedValue(mockPerson);
      repository.update.mockResolvedValue(updatedPerson);

      const result = await service.update('person-1', updatePayload, 'user-1');

      expect(result).toEqual(updatedPerson);
      expect(repository.update).toHaveBeenCalledWith('person-1', {
        fullName: 'Jane Doe',
        email: 'jane@example.com',
      });
    });

    it('should create an audit record on update', async () => {
      repository.findById.mockResolvedValue(mockPerson);
      repository.update.mockResolvedValue(updatedPerson);

      await service.update('person-1', updatePayload, 'user-1');

      expect(mockPrisma.auditRecord.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          entityType: 'Person',
          entityId: 'person-1',
          operation: 'UPDATE',
          diff: {
            before: JSON.parse(JSON.stringify(mockPerson)),
            after: JSON.parse(JSON.stringify(updatedPerson)),
          },
        },
      });
    });

    it('should reject update with invalid email', async () => {
      const invalidUpdate = { email: 'not-valid' };

      await expect(
        service.update('person-1', invalidUpdate, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject update with empty body', async () => {
      await expect(
        service.update('person-1', {}, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should delete a person without linked employees', async () => {
      repository.findById.mockResolvedValue(mockPerson);
      repository.delete.mockResolvedValue({ canDelete: true, employees: [] });

      const result = await service.delete('person-1', 'user-1');

      expect(result).toEqual({ message: 'Person deleted successfully' });
      expect(repository.delete).toHaveBeenCalledWith('person-1');
    });

    it('should create an audit record on delete', async () => {
      repository.findById.mockResolvedValue(mockPerson);
      repository.delete.mockResolvedValue({ canDelete: true, employees: [] });

      await service.delete('person-1', 'user-1');

      expect(mockPrisma.auditRecord.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          entityType: 'Person',
          entityId: 'person-1',
          operation: 'DELETE',
          diff: { before: JSON.parse(JSON.stringify(mockPerson)) },
        },
      });
    });

    it('should reject deletion when person has linked employees', async () => {
      repository.findById.mockResolvedValue(mockPerson);
      repository.delete.mockResolvedValue({
        canDelete: false,
        employees: [{ id: 'emp-1' }, { id: 'emp-2' }],
      });

      await expect(service.delete('person-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should propagate NotFoundException if person does not exist', async () => {
      repository.findById.mockRejectedValue(
        new NotFoundException('Person with id "nonexistent" not found'),
      );

      await expect(service.delete('nonexistent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
