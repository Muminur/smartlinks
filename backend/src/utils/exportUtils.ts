import { Parser } from 'json2csv';
import { Response } from 'express';
import { IAnalyticsDocument } from '../models/analytics.model';
import { logger } from './logger';

/**
 * Export Utilities - Functions for exporting analytics data to CSV and JSON formats
 * Handles large datasets with streaming and proper formatting
 */

/**
 * Interface for formatted analytics export
 */
export interface FormattedAnalytics {
  timestamp: string;
  linkId: string;
  slug?: string;
  // Location fields (flattened)
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  // Device fields (flattened)
  deviceType?: string;
  deviceBrand?: string;
  deviceModel?: string;
  // OS fields (flattened)
  osName?: string;
  osVersion?: string;
  // Browser fields (flattened)
  browserName?: string;
  browserVersion?: string;
  // Referrer fields (flattened)
  referrerDomain?: string;
  referrerType?: string;
  referrerUrl?: string;
  // UTM fields (flattened)
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

/**
 * Format analytics records for export
 * Flattens nested objects and converts timestamps to readable format
 * @param analytics - Array of analytics documents
 * @returns Array of formatted analytics objects
 */
export function formatAnalyticsForExport(
  analytics: IAnalyticsDocument[]
): FormattedAnalytics[] {
  return analytics.map((record) => {
    return {
      timestamp: record.timestamp.toISOString(),
      linkId: record.linkId.toString(),
      slug: (record as any).slug || undefined,
      // Location
      country: record.location?.country || undefined,
      countryCode: record.location?.countryCode || undefined,
      region: record.location?.region || undefined,
      city: record.location?.city || undefined,
      latitude: record.location?.latitude || undefined,
      longitude: record.location?.longitude || undefined,
      // Device
      deviceType: record.device?.type || undefined,
      deviceBrand: record.device?.brand || undefined,
      deviceModel: record.device?.model || undefined,
      // OS
      osName: record.os?.name || undefined,
      osVersion: record.os?.version || undefined,
      // Browser
      browserName: record.browser?.name || undefined,
      browserVersion: record.browser?.version || undefined,
      // Referrer
      referrerDomain: record.referrer?.domain || undefined,
      referrerType: record.referrer?.type || undefined,
      referrerUrl: record.referrer?.url || undefined,
      // UTM
      utmSource: record.utm?.source || undefined,
      utmMedium: record.utm?.medium || undefined,
      utmCampaign: record.utm?.campaign || undefined,
      utmTerm: record.utm?.term || undefined,
      utmContent: record.utm?.content || undefined,
    };
  });
}

/**
 * Convert analytics data to CSV format
 * @param data - Array of analytics documents
 * @returns CSV string
 */
export function exportAnalyticsToCSV(data: IAnalyticsDocument[]): string {
  try {
    if (data.length === 0) {
      return '';
    }

    // Format the data
    const formattedData = formatAnalyticsForExport(data);

    // Define CSV fields
    const fields = [
      { label: 'Timestamp', value: 'timestamp' },
      { label: 'Link ID', value: 'linkId' },
      { label: 'Slug', value: 'slug' },
      // Location
      { label: 'Country', value: 'country' },
      { label: 'Country Code', value: 'countryCode' },
      { label: 'Region', value: 'region' },
      { label: 'City', value: 'city' },
      { label: 'Latitude', value: 'latitude' },
      { label: 'Longitude', value: 'longitude' },
      // Device
      { label: 'Device Type', value: 'deviceType' },
      { label: 'Device Brand', value: 'deviceBrand' },
      { label: 'Device Model', value: 'deviceModel' },
      // OS
      { label: 'OS Name', value: 'osName' },
      { label: 'OS Version', value: 'osVersion' },
      // Browser
      { label: 'Browser Name', value: 'browserName' },
      { label: 'Browser Version', value: 'browserVersion' },
      // Referrer
      { label: 'Referrer Domain', value: 'referrerDomain' },
      { label: 'Referrer Type', value: 'referrerType' },
      { label: 'Referrer URL', value: 'referrerUrl' },
      // UTM
      { label: 'UTM Source', value: 'utmSource' },
      { label: 'UTM Medium', value: 'utmMedium' },
      { label: 'UTM Campaign', value: 'utmCampaign' },
      { label: 'UTM Term', value: 'utmTerm' },
      { label: 'UTM Content', value: 'utmContent' },
    ];

    // Create parser
    const parser = new Parser({ fields });

    // Parse to CSV
    const csv = parser.parse(formattedData);

    logger.debug(`Exported ${data.length} analytics records to CSV`);
    return csv;
  } catch (error) {
    logger.error('Error exporting analytics to CSV:', error);
    throw new Error('Failed to export analytics to CSV');
  }
}

/**
 * Convert analytics data to JSON format
 * Includes metadata and formatted data
 * @param data - Array of analytics documents
 * @param metadata - Optional metadata to include in the export
 * @returns JSON string
 */
export function exportAnalyticsToJSON(
  data: IAnalyticsDocument[],
  metadata?: {
    slug?: string;
    startDate?: Date | null;
    endDate?: Date | null;
    totalRecords?: number;
  }
): string {
  try {
    // Format the data
    const formattedData = formatAnalyticsForExport(data);

    // Build the export object
    const exportData = {
      exportedAt: new Date().toISOString(),
      metadata: {
        slug: metadata?.slug || null,
        dateRange: {
          startDate: metadata?.startDate?.toISOString() || null,
          endDate: metadata?.endDate?.toISOString() || null,
        },
        totalRecords: metadata?.totalRecords || data.length,
        recordsInFile: data.length,
      },
      data: formattedData,
    };

    // Convert to JSON string with pretty formatting
    const json = JSON.stringify(exportData, null, 2);

    logger.debug(`Exported ${data.length} analytics records to JSON`);
    return json;
  } catch (error) {
    logger.error('Error exporting analytics to JSON:', error);
    throw new Error('Failed to export analytics to JSON');
  }
}

/**
 * Stream large CSV export to response
 * This function streams analytics data without loading all records into memory
 * @param query - MongoDB query object
 * @param res - Express response object
 * @param filename - Filename for the download
 */
export async function streamCSVExport(
  query: any,
  res: Response,
  filename: string
): Promise<void> {
  try {
    logger.info(`Starting CSV stream export: ${filename}`);

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Transfer-Encoding', 'chunked');

    // Define CSV fields
    const fields = [
      { label: 'Timestamp', value: 'timestamp' },
      { label: 'Link ID', value: 'linkId' },
      { label: 'Slug', value: 'slug' },
      
      // Location
      { label: 'Country', value: 'country' },
      { label: 'Country Code', value: 'countryCode' },
      { label: 'Region', value: 'region' },
      { label: 'City', value: 'city' },
      { label: 'Latitude', value: 'latitude' },
      { label: 'Longitude', value: 'longitude' },
      
      // Device
      { label: 'Device Type', value: 'deviceType' },
      { label: 'Device Brand', value: 'deviceBrand' },
      { label: 'Device Model', value: 'deviceModel' },
      // OS
      { label: 'OS Name', value: 'osName' },
      { label: 'OS Version', value: 'osVersion' },
      // Browser
      { label: 'Browser Name', value: 'browserName' },
      { label: 'Browser Version', value: 'browserVersion' },
      // Referrer
      { label: 'Referrer Domain', value: 'referrerDomain' },
      { label: 'Referrer Type', value: 'referrerType' },
      { label: 'Referrer URL', value: 'referrerUrl' },
      // UTM
      { label: 'UTM Source', value: 'utmSource' },
      { label: 'UTM Medium', value: 'utmMedium' },
      { label: 'UTM Campaign', value: 'utmCampaign' },
      { label: 'UTM Term', value: 'utmTerm' },
      { label: 'UTM Content', value: 'utmContent' },
      // Additional
      
      
      
    ];

    // Create parser with header
    const parser = new Parser({ fields });

    // Write CSV header
    const header = parser.parse([]);
    res.write(header);
    res.write('\n');

    // Get cursor from query
    const cursor = query.cursor();

    let count = 0;
    const batchSize = 100;
    let batch: IAnalyticsDocument[] = [];

    // Stream data in batches
    cursor.on('data', (record: IAnalyticsDocument) => {
      batch.push(record);

      // Process batch when it reaches batchSize
      if (batch.length >= batchSize) {
        const formattedBatch = formatAnalyticsForExport(batch);

        // Parse batch to CSV (without header)
        for (const row of formattedBatch) {
          const csvRow = fields.map((field) => {
            const value = (row as any)[field.value];
            if (value === undefined || value === null) return '';
            // Escape quotes and commas
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          });
          res.write(csvRow.join(',') + '\n');
        }

        count += batch.length;
        batch = [];
      }
    });

    // Handle cursor end
    cursor.on('end', () => {
      // Process remaining records
      if (batch.length > 0) {
        const formattedBatch = formatAnalyticsForExport(batch);

        for (const row of formattedBatch) {
          const csvRow = fields.map((field) => {
            const value = (row as any)[field.value];
            if (value === undefined || value === null) return '';
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          });
          res.write(csvRow.join(',') + '\n');
        }

        count += batch.length;
      }

      res.end();
      logger.info(`CSV stream export completed: ${count} records exported`);
    });

    // Handle errors
    cursor.on('error', (error: Error) => {
      logger.error('Error during CSV stream export:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: {
            code: 'EXPORT_ERROR',
            message: 'Failed to export analytics data',
          },
        });
      }
    });
  } catch (error) {
    logger.error('Error setting up CSV stream export:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: {
          code: 'EXPORT_ERROR',
          message: 'Failed to export analytics data',
        },
      });
    }
  }
}
