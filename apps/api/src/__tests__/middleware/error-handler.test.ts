import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import { errorHandler } from '../../middleware/error-handler';

const createMockContext = () => {
  const json = vi.fn().mockReturnThis();
  return {
    json,
  } as unknown as Context;
};

describe('Error Handler Middleware', () => {
  describe('ZodError handling', () => {
    it('should return 400 for Zod validation errors', () => {
      const mockContext = createMockContext();
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['email'],
          message: 'Expected string, received number',
        },
      ]);

      errorHandler(zodError, mockContext);

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          error: 'Validation Error',
          message: 'Invalid request data',
          details: [{ path: 'email', message: 'Expected string, received number' }],
        },
        400,
      );
    });

    it('should handle multiple validation errors', () => {
      const mockContext = createMockContext();
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'undefined',
          path: ['name'],
          message: 'Required',
        },
        {
          code: 'invalid_string',
          validation: 'email',
          path: ['email'],
          message: 'Invalid email',
        },
      ]);

      errorHandler(zodError, mockContext);

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          error: 'Validation Error',
          message: 'Invalid request data',
          details: [
            { path: 'name', message: 'Required' },
            { path: 'email', message: 'Invalid email' },
          ],
        },
        400,
      );
    });

    it('should handle nested path validation errors', () => {
      const mockContext = createMockContext();
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['user', 'profile', 'name'],
          message: 'Expected string',
        },
      ]);

      errorHandler(zodError, mockContext);

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          error: 'Validation Error',
          message: 'Invalid request data',
          details: [{ path: 'user.profile.name', message: 'Expected string' }],
        },
        400,
      );
    });
  });

  describe('HTTPException handling', () => {
    it('should return correct status for HTTPException', () => {
      const mockContext = createMockContext();
      const httpException = new HTTPException(404, { message: 'Resource not found' });

      errorHandler(httpException, mockContext);

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          error: 'HTTP Error',
          message: 'Resource not found',
        },
        404,
      );
    });

    it('should handle 401 Unauthorized', () => {
      const mockContext = createMockContext();
      const httpException = new HTTPException(401, { message: 'Unauthorized' });

      errorHandler(httpException, mockContext);

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          error: 'HTTP Error',
          message: 'Unauthorized',
        },
        401,
      );
    });

    it('should handle 403 Forbidden', () => {
      const mockContext = createMockContext();
      const httpException = new HTTPException(403, { message: 'Forbidden' });

      errorHandler(httpException, mockContext);

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          error: 'HTTP Error',
          message: 'Forbidden',
        },
        403,
      );
    });

    it('should handle 409 Conflict', () => {
      const mockContext = createMockContext();
      const httpException = new HTTPException(409, { message: 'Email already exists' });

      errorHandler(httpException, mockContext);

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          error: 'HTTP Error',
          message: 'Email already exists',
        },
        409,
      );
    });
  });

  describe('Generic error handling', () => {
    it('should return 500 for generic errors in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockContext = createMockContext();
      const genericError = new Error('Database connection failed');

      errorHandler(genericError, mockContext);

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          error: 'Internal Server Error',
          message: 'An unexpected error occurred',
        },
        500,
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should return error message in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const mockContext = createMockContext();
      const genericError = new Error('Database connection failed');

      errorHandler(genericError, mockContext);

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          error: 'Internal Server Error',
          message: 'Database connection failed',
        },
        500,
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle errors without message', () => {
      const mockContext = createMockContext();
      const genericError = new Error();

      errorHandler(genericError, mockContext);

      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal Server Error',
        }),
        500,
      );
    });
  });
});
