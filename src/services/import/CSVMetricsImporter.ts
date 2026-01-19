/**
 * CSV Metrics Importer
 *
 * Imports traction metrics from CSV files. Supports various column formats
 * and automatically detects date formats.
 *
 * Expected columns (flexible naming):
 * - date / metric_date / Date
 * - customers / customer_count / Customers
 * - mrr / monthly_recurring_revenue / MRR
 * - revenue / total_revenue / Revenue
 * - active_users / activeUsers / Active Users
 * - nps / nps_score / NPS Score
 */

import { createTractionMetrics, getProgressMilestonesByProject, createProgressMilestone } from '@/lib/db/queries';
import type { ProgressMilestoneType } from '@/types';

export interface CSVImportResult {
  success: boolean;
  rowsProcessed: number;
  rowsFailed: number;
  errors: string[];
  milestonesCreated: ProgressMilestoneType[];
}

export interface ParsedMetricRow {
  date: Date;
  customers?: number;
  mrrCents?: number;
  revenueCents?: number;
  activeUsers?: number;
  npsScore?: number;
  customMetrics?: Record<string, number>;
}

// Column name mappings (normalized to lowercase)
const COLUMN_MAPPINGS: Record<string, keyof ParsedMetricRow | 'custom'> = {
  // Date columns
  date: 'date',
  metric_date: 'date',
  metricdate: 'date',

  // Customer columns
  customers: 'customers',
  customer_count: 'customers',
  customercount: 'customers',
  customer: 'customers',

  // MRR columns
  mrr: 'mrrCents',
  monthly_recurring_revenue: 'mrrCents',
  monthlyrecurringrevenue: 'mrrCents',
  mrr_cents: 'mrrCents',

  // Revenue columns
  revenue: 'revenueCents',
  total_revenue: 'revenueCents',
  totalrevenue: 'revenueCents',
  revenue_cents: 'revenueCents',

  // Active users columns
  active_users: 'activeUsers',
  activeusers: 'activeUsers',
  dau: 'activeUsers',
  daily_active_users: 'activeUsers',
  mau: 'activeUsers',

  // NPS columns
  nps: 'npsScore',
  nps_score: 'npsScore',
  npsscore: 'npsScore',
  net_promoter_score: 'npsScore',
};

// Milestone thresholds for auto-detection
const CUSTOMER_MILESTONES: { type: ProgressMilestoneType; threshold: number }[] = [
  { type: 'first_customer', threshold: 1 },
  { type: 'ten_customers', threshold: 10 },
  { type: 'hundred_customers', threshold: 100 },
];

const MRR_MILESTONES: { type: ProgressMilestoneType; threshold: number }[] = [
  { type: 'first_revenue', threshold: 1 },
  { type: 'mrr_1k', threshold: 100000 },
  { type: 'mrr_10k', threshold: 1000000 },
  { type: 'mrr_100k', threshold: 10000000 },
];

export class CSVMetricsImporter {
  /**
   * Parse CSV content into rows
   */
  parseCSV(content: string): string[][] {
    const lines = content.split(/\r?\n/).filter((line) => line.trim());
    const rows: string[][] = [];

    for (const line of lines) {
      // Handle quoted values with commas inside
      const row: string[] = [];
      let current = '';
      let inQuotes = false;

      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          row.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      row.push(current.trim());
      rows.push(row);
    }

    return rows;
  }

  /**
   * Detect column mappings from header row
   */
  detectColumns(headers: string[]): Map<number, keyof ParsedMetricRow | 'custom'> {
    const mappings = new Map<number, keyof ParsedMetricRow | 'custom'>();

    headers.forEach((header, index) => {
      const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '');
      const mapping = COLUMN_MAPPINGS[normalized];

      if (mapping) {
        mappings.set(index, mapping);
      } else {
        // Treat unknown columns as custom metrics
        mappings.set(index, 'custom');
      }
    });

    return mappings;
  }

  /**
   * Parse a date string into a Date object
   */
  parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    // Try common date formats
    const formats = [
      // ISO format
      /^(\d{4})-(\d{2})-(\d{2})$/,
      // US format
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      // UK format
      /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/,
    ];

    // ISO format
    let match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
    }

    // US format (MM/DD/YYYY)
    match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      return new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]));
    }

    // UK format (DD/MM/YYYY)
    match = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (match) {
      return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
    }

    // Try native Date parsing as fallback
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }

    return null;
  }

  /**
   * Parse a number from various formats
   */
  parseNumber(value: string): number | null {
    if (!value || value === '' || value === '-') return null;

    // Remove currency symbols and commas
    const cleaned = value.replace(/[$€£¥,\s]/g, '').trim();

    // Handle percentages
    if (cleaned.endsWith('%')) {
      const num = parseFloat(cleaned.slice(0, -1));
      return isNaN(num) ? null : num;
    }

    // Handle k/K suffix (thousands)
    if (cleaned.toLowerCase().endsWith('k')) {
      const num = parseFloat(cleaned.slice(0, -1));
      return isNaN(num) ? null : num * 1000;
    }

    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }

  /**
   * Parse a single row into a metrics object
   */
  parseRow(
    values: string[],
    columnMappings: Map<number, keyof ParsedMetricRow | 'custom'>,
    headers: string[]
  ): ParsedMetricRow | null {
    const row: ParsedMetricRow = {
      date: new Date(),
      customMetrics: {},
    };

    let hasDate = false;

    for (const [index, mapping] of columnMappings) {
      const value = values[index];
      if (!value || value.trim() === '') continue;

      switch (mapping) {
        case 'date': {
          const date = this.parseDate(value);
          if (date) {
            row.date = date;
            hasDate = true;
          }
          break;
        }
        case 'customers': {
          const num = this.parseNumber(value);
          if (num !== null) row.customers = Math.round(num);
          break;
        }
        case 'mrrCents': {
          const num = this.parseNumber(value);
          // Assume input is in dollars, convert to cents
          if (num !== null) row.mrrCents = Math.round(num * 100);
          break;
        }
        case 'revenueCents': {
          const num = this.parseNumber(value);
          // Assume input is in dollars, convert to cents
          if (num !== null) row.revenueCents = Math.round(num * 100);
          break;
        }
        case 'activeUsers': {
          const num = this.parseNumber(value);
          if (num !== null) row.activeUsers = Math.round(num);
          break;
        }
        case 'npsScore': {
          const num = this.parseNumber(value);
          if (num !== null) row.npsScore = num;
          break;
        }
        case 'custom': {
          const num = this.parseNumber(value);
          if (num !== null && row.customMetrics) {
            row.customMetrics[headers[index]] = num;
          }
          break;
        }
      }
    }

    // Must have a date to be valid
    if (!hasDate) return null;

    return row;
  }

  /**
   * Import CSV data into traction metrics
   */
  async import(
    csvContent: string,
    projectId: string,
    options: {
      detectMilestones?: boolean;
      skipHeader?: boolean;
    } = {}
  ): Promise<CSVImportResult> {
    const { detectMilestones = true, skipHeader = true } = options;

    const result: CSVImportResult = {
      success: true,
      rowsProcessed: 0,
      rowsFailed: 0,
      errors: [],
      milestonesCreated: [],
    };

    try {
      const rows = this.parseCSV(csvContent);

      if (rows.length === 0) {
        result.success = false;
        result.errors.push('No data found in CSV');
        return result;
      }

      // First row is headers
      const headers = rows[0];
      const columnMappings = this.detectColumns(headers);

      // Check if we have required columns
      let hasDateColumn = false;
      for (const [, mapping] of columnMappings) {
        if (mapping === 'date') hasDateColumn = true;
      }

      if (!hasDateColumn) {
        result.success = false;
        result.errors.push('No date column found. Please include a column named "date" or "metric_date".');
        return result;
      }

      // Track max values for milestone detection
      let maxCustomers = 0;
      let maxMrrCents = 0;
      let hasRevenue = false;

      // Process data rows
      const startIndex = skipHeader ? 1 : 0;
      for (let i = startIndex; i < rows.length; i++) {
        const row = rows[i];

        try {
          const parsed = this.parseRow(row, columnMappings, headers);

          if (!parsed) {
            result.rowsFailed++;
            result.errors.push(`Row ${i + 1}: Could not parse date`);
            continue;
          }

          // Create traction metric
          await createTractionMetrics({
            projectId,
            metricDate: parsed.date,
            customers: parsed.customers,
            mrrCents: parsed.mrrCents,
            revenueCents: parsed.revenueCents,
            activeUsers: parsed.activeUsers,
            npsScore: parsed.npsScore,
            customMetrics: Object.keys(parsed.customMetrics || {}).length > 0
              ? parsed.customMetrics
              : undefined,
          });

          result.rowsProcessed++;

          // Track for milestone detection
          if (parsed.customers) maxCustomers = Math.max(maxCustomers, parsed.customers);
          if (parsed.mrrCents) maxMrrCents = Math.max(maxMrrCents, parsed.mrrCents);
          if ((parsed.revenueCents && parsed.revenueCents > 0) || (parsed.mrrCents && parsed.mrrCents > 0)) {
            hasRevenue = true;
          }
        } catch (error) {
          result.rowsFailed++;
          result.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Detect and create milestones
      if (detectMilestones && result.rowsProcessed > 0) {
        const existingMilestones = await getProgressMilestonesByProject(projectId);
        const existingTypes = new Set(existingMilestones.map((m) => m.milestoneType));

        // Check customer milestones
        for (const milestone of CUSTOMER_MILESTONES) {
          if (maxCustomers >= milestone.threshold && !existingTypes.has(milestone.type)) {
            await createProgressMilestone({
              projectId,
              milestoneType: milestone.type,
              evidence: {
                metric: 'customers',
                value: maxCustomers,
                notes: 'Detected from CSV import',
              },
              visibility: 'cohort',
            });
            result.milestonesCreated.push(milestone.type);
          }
        }

        // Check first revenue
        if (hasRevenue && !existingTypes.has('first_revenue')) {
          await createProgressMilestone({
            projectId,
            milestoneType: 'first_revenue',
            evidence: {
              metric: 'revenue',
              notes: 'Detected from CSV import',
            },
            visibility: 'cohort',
          });
          result.milestonesCreated.push('first_revenue');
        }

        // Check MRR milestones
        for (const milestone of MRR_MILESTONES) {
          if (milestone.type === 'first_revenue') continue; // Already handled
          if (maxMrrCents >= milestone.threshold && !existingTypes.has(milestone.type)) {
            await createProgressMilestone({
              projectId,
              milestoneType: milestone.type,
              evidence: {
                metric: 'mrr',
                value: maxMrrCents / 100,
                notes: 'Detected from CSV import',
              },
              visibility: 'cohort',
            });
            result.milestonesCreated.push(milestone.type);
          }
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Import failed');
    }

    return result;
  }
}

// Export singleton
export const csvMetricsImporter = new CSVMetricsImporter();

export default csvMetricsImporter;
