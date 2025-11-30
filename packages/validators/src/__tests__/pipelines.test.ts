import { describe, expect, it } from 'vitest';
import {
  createPipelineSchema,
  createDealSchema,
  updateDealSchema,
  moveDealSchema,
} from '../index';

describe('Pipeline Schemas', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';

  describe('createPipelineSchema', () => {
    it('should accept valid pipeline with stages', () => {
      const result = createPipelineSchema.parse({
        name: 'Sales Pipeline',
        stages: [
          { name: 'Lead', color: '#FF5733' },
          { name: 'Qualified', color: '#33FF57' },
          { name: 'Proposal', color: '#3357FF' },
        ],
      });
      expect(result.name).toBe('Sales Pipeline');
      expect(result.stages).toHaveLength(3);
    });

    it('should accept pipeline with single stage', () => {
      const result = createPipelineSchema.parse({
        name: 'Simple Pipeline',
        stages: [{ name: 'Initial', color: '#000000' }],
      });
      expect(result.stages).toHaveLength(1);
    });

    it('should reject empty name', () => {
      expect(() =>
        createPipelineSchema.parse({
          name: '',
          stages: [{ name: 'Stage', color: '#FF0000' }],
        }),
      ).toThrow('Nome é obrigatório');
    });

    it('should reject empty stages array', () => {
      expect(() =>
        createPipelineSchema.parse({
          name: 'Pipeline',
          stages: [],
        }),
      ).toThrow('Pipeline deve ter ao menos uma etapa');
    });

    it('should reject stage with empty name', () => {
      expect(() =>
        createPipelineSchema.parse({
          name: 'Pipeline',
          stages: [{ name: '', color: '#FF0000' }],
        }),
      ).toThrow();
    });

    it('should reject invalid color format', () => {
      expect(() =>
        createPipelineSchema.parse({
          name: 'Pipeline',
          stages: [{ name: 'Stage', color: 'red' }],
        }),
      ).toThrow();
    });

    it('should reject color without hash', () => {
      expect(() =>
        createPipelineSchema.parse({
          name: 'Pipeline',
          stages: [{ name: 'Stage', color: 'FF0000' }],
        }),
      ).toThrow();
    });

    it('should reject color with wrong length', () => {
      expect(() =>
        createPipelineSchema.parse({
          name: 'Pipeline',
          stages: [{ name: 'Stage', color: '#FFF' }],
        }),
      ).toThrow();
    });

    it('should accept lowercase hex color', () => {
      const result = createPipelineSchema.parse({
        name: 'Pipeline',
        stages: [{ name: 'Stage', color: '#ff00ff' }],
      });
      expect(result.stages[0].color).toBe('#ff00ff');
    });
  });

  describe('createDealSchema', () => {
    const validDeal = {
      pipelineId: validUuid,
      stageId: validUuid,
      contactId: validUuid,
      title: 'New Deal',
    };

    it('should accept valid deal with required fields', () => {
      const result = createDealSchema.parse(validDeal);
      expect(result.title).toBe('New Deal');
      expect(result.currency).toBe('BRL');
    });

    it('should accept deal with all fields', () => {
      const result = createDealSchema.parse({
        ...validDeal,
        value: 50000,
        currency: 'USD',
        expectedCloseDate: '2024-12-31',
        assigneeId: validUuid,
      });
      expect(result.value).toBe(50000);
      expect(result.currency).toBe('USD');
      expect(result.expectedCloseDate).toBeInstanceOf(Date);
      expect(result.assigneeId).toBe(validUuid);
    });

    it('should reject empty title', () => {
      expect(() =>
        createDealSchema.parse({
          ...validDeal,
          title: '',
        }),
      ).toThrow('Título é obrigatório');
    });

    it('should reject invalid pipelineId', () => {
      expect(() =>
        createDealSchema.parse({
          ...validDeal,
          pipelineId: 'not-a-uuid',
        }),
      ).toThrow();
    });

    it('should reject negative value', () => {
      expect(() =>
        createDealSchema.parse({
          ...validDeal,
          value: -100,
        }),
      ).toThrow();
    });

    it('should reject zero value', () => {
      expect(() =>
        createDealSchema.parse({
          ...validDeal,
          value: 0,
        }),
      ).toThrow();
    });

    it('should accept null value', () => {
      const result = createDealSchema.parse({
        ...validDeal,
        value: null,
      });
      expect(result.value).toBeNull();
    });

    it('should reject invalid currency length', () => {
      expect(() =>
        createDealSchema.parse({
          ...validDeal,
          currency: 'USDD',
        }),
      ).toThrow();
    });

    it('should coerce date string to Date object', () => {
      const result = createDealSchema.parse({
        ...validDeal,
        expectedCloseDate: '2024-06-15T10:00:00Z',
      });
      expect(result.expectedCloseDate).toBeInstanceOf(Date);
    });

    it('should accept null expectedCloseDate', () => {
      const result = createDealSchema.parse({
        ...validDeal,
        expectedCloseDate: null,
      });
      expect(result.expectedCloseDate).toBeNull();
    });
  });

  describe('updateDealSchema', () => {
    it('should accept partial update with title only', () => {
      const result = updateDealSchema.parse({
        title: 'Updated Title',
      });
      expect(result.title).toBe('Updated Title');
    });

    it('should accept partial update with value only', () => {
      const result = updateDealSchema.parse({
        value: 100000,
      });
      expect(result.value).toBe(100000);
    });

    it('should accept empty update', () => {
      const result = updateDealSchema.parse({});
      expect(result).toEqual({});
    });

    it('should still validate constraints when fields provided', () => {
      expect(() =>
        updateDealSchema.parse({
          value: -100,
        }),
      ).toThrow();
    });
  });

  describe('moveDealSchema', () => {
    it('should accept valid move with stageId', () => {
      const result = moveDealSchema.parse({
        stageId: validUuid,
      });
      expect(result.stageId).toBe(validUuid);
    });

    it('should accept move with order', () => {
      const result = moveDealSchema.parse({
        stageId: validUuid,
        order: 5,
      });
      expect(result.order).toBe(5);
    });

    it('should accept order 0', () => {
      const result = moveDealSchema.parse({
        stageId: validUuid,
        order: 0,
      });
      expect(result.order).toBe(0);
    });

    it('should reject negative order', () => {
      expect(() =>
        moveDealSchema.parse({
          stageId: validUuid,
          order: -1,
        }),
      ).toThrow();
    });

    it('should reject invalid stageId', () => {
      expect(() =>
        moveDealSchema.parse({
          stageId: 'not-a-uuid',
        }),
      ).toThrow();
    });

    it('should reject non-integer order', () => {
      expect(() =>
        moveDealSchema.parse({
          stageId: validUuid,
          order: 1.5,
        }),
      ).toThrow();
    });
  });
});
