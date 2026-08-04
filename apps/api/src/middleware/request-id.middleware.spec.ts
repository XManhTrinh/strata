import { RequestIdMiddleware } from './request-id.middleware';

describe('RequestIdMiddleware', () => {
  let middleware: RequestIdMiddleware;
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    middleware = new RequestIdMiddleware();
    mockRequest = { headers: {} };
    mockResponse = { setHeader: jest.fn() };
    mockNext = jest.fn();
  });

  it('should generate a UUID request ID when none provided', () => {
    middleware.use(mockRequest, mockResponse, mockNext);

    expect(mockRequest.requestId).toBeDefined();
    expect(mockRequest.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-ID', mockRequest.requestId);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should use existing X-Request-ID header if provided', () => {
    mockRequest.headers['x-request-id'] = 'existing-id-123';
    middleware.use(mockRequest, mockResponse, mockNext);

    expect(mockRequest.requestId).toBe('existing-id-123');
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-ID', 'existing-id-123');
    expect(mockNext).toHaveBeenCalled();
  });
});
