import { and, eq } from 'drizzle-orm';
import { db, schema } from '../lib/db';

const { contacts } = schema;

interface CSVContact {
  name: string;
  email?: string;
  phone?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}

export const importService = {
  parseCSV(csvContent: string): { headers: string[]; rows: string[][] } {
    const lines = csvContent.split(/\r?\n/).filter((line) => line.trim());

    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }

    const headers = this.parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());
    const rows = lines.slice(1).map((line) => this.parseCSVLine(line));

    return { headers, rows };
  },

  parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  },

  mapRowToContact(
    headers: string[],
    row: string[],
    fieldMapping: Record<string, string>,
  ): CSVContact | null {
    const contact: CSVContact = {
      name: '',
    };

    // Map fields based on provided mapping
    for (const [csvField, contactField] of Object.entries(fieldMapping)) {
      const headerIndex = headers.indexOf(csvField.toLowerCase());
      if (headerIndex === -1) continue;

      const value = row[headerIndex]?.trim();
      if (!value) continue;

      switch (contactField) {
        case 'name':
          contact.name = value;
          break;
        case 'email':
          contact.email = value;
          break;
        case 'phone':
          contact.phone = value;
          break;
        case 'tags':
          contact.tags = value
            .split(/[,;]/)
            .map((t) => t.trim())
            .filter(Boolean);
          break;
        default:
          if (!contact.customFields) contact.customFields = {};
          contact.customFields[contactField] = value;
      }
    }

    // If no name is provided, try to use email or phone
    if (!contact.name) {
      if (contact.email) {
        contact.name = contact.email.split('@')[0];
      } else if (contact.phone) {
        contact.name = contact.phone;
      } else {
        return null;
      }
    }

    return contact;
  },

  async importContacts(
    tenantId: string,
    csvContent: string,
    fieldMapping: Record<string, string>,
    options: {
      skipDuplicates?: boolean;
      updateExisting?: boolean;
    } = {},
  ): Promise<ImportResult> {
    const { headers, rows } = this.parseCSV(csvContent);
    const result: ImportResult = {
      total: rows.length,
      imported: 0,
      skipped: 0,
      errors: [],
    };

    const { skipDuplicates = true, updateExisting = false } = options;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 because row 1 is headers and arrays are 0-indexed

      try {
        const contactData = this.mapRowToContact(headers, row, fieldMapping);

        if (!contactData) {
          result.errors.push({ row: rowNumber, error: 'Invalid or empty row' });
          result.skipped++;
          continue;
        }

        // Check for duplicates by phone or email
        let existingContact = null;
        const phone = contactData.phone;
        const email = contactData.email;

        if (phone) {
          const existing = await db.query.contacts.findFirst({
            where: (contacts, { and, eq }) =>
              and(eq(contacts.tenantId, tenantId), eq(contacts.phone, phone)),
          });
          if (existing) existingContact = existing;
        }

        if (!existingContact && email) {
          const existing = await db.query.contacts.findFirst({
            where: (contacts, { and, eq }) =>
              and(eq(contacts.tenantId, tenantId), eq(contacts.email, email)),
          });
          if (existing) existingContact = existing;
        }

        if (existingContact) {
          if (skipDuplicates && !updateExisting) {
            result.skipped++;
            continue;
          }

          if (updateExisting) {
            // Update existing contact
            await db
              .update(contacts)
              .set({
                name: contactData.name,
                email: contactData.email,
                phone: contactData.phone,
                tags: contactData.tags || [],
                customFields: contactData.customFields || {},
                updatedAt: new Date(),
              })
              .where(and(eq(contacts.id, existingContact.id), eq(contacts.tenantId, tenantId)));
            result.imported++;
            continue;
          }
        }

        // Create new contact
        await db.insert(contacts).values({
          tenantId,
          name: contactData.name,
          email: contactData.email,
          phone: contactData.phone,
          tags: contactData.tags || [],
          customFields: contactData.customFields || {},
        });

        result.imported++;
      } catch (error) {
        result.errors.push({
          row: rowNumber,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  },

  generateCSVTemplate(): string {
    const headers = ['name', 'email', 'phone', 'tags'];
    const sampleRow = ['João Silva', 'joao@email.com', '+5511999999999', 'cliente,vip'];

    return [headers.join(','), sampleRow.join(',')].join('\n');
  },
};
