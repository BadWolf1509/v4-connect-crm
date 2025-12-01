import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { type AppType, requireAuth } from '../middleware/auth';
import { importService } from '../services/import.service';

const importRoutes = new Hono<AppType>();

importRoutes.use('*', requireAuth);

const importContactsSchema = z.object({
  csvContent: z.string().min(1),
  fieldMapping: z.record(z.string()),
  options: z
    .object({
      skipDuplicates: z.boolean().optional(),
      updateExisting: z.boolean().optional(),
    })
    .optional(),
});

const previewSchema = z.object({
  csvContent: z.string().min(1),
});

// Preview CSV content
importRoutes.post('/contacts/preview', zValidator('json', previewSchema), async (c) => {
  const { csvContent } = c.req.valid('json');

  try {
    const { headers, rows } = importService.parseCSV(csvContent);

    // Return first 5 rows for preview
    const preview = rows.slice(0, 5).map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    return c.json({
      headers,
      preview,
      totalRows: rows.length,
    });
  } catch (error) {
    throw new HTTPException(400, {
      message: error instanceof Error ? error.message : 'Failed to parse CSV',
    });
  }
});

// Import contacts from CSV
importRoutes.post('/contacts', zValidator('json', importContactsSchema), async (c) => {
  const auth = c.get('auth');
  const { csvContent, fieldMapping, options } = c.req.valid('json');

  // Validate that at least name or phone/email is mapped
  const mappedFields = Object.values(fieldMapping);
  const hasRequiredField =
    mappedFields.includes('name') ||
    mappedFields.includes('phone') ||
    mappedFields.includes('email');

  if (!hasRequiredField) {
    throw new HTTPException(400, {
      message: 'At least one of name, phone, or email must be mapped',
    });
  }

  try {
    const result = await importService.importContacts(
      auth.tenantId,
      csvContent,
      fieldMapping,
      options,
    );

    return c.json(result);
  } catch (error) {
    throw new HTTPException(500, {
      message: error instanceof Error ? error.message : 'Import failed',
    });
  }
});

// Get CSV template
importRoutes.get('/contacts/template', (_c) => {
  const template = importService.generateCSVTemplate();

  return new Response(template, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="contacts_template.csv"',
    },
  });
});

export { importRoutes };
