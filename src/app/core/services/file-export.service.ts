import { Injectable } from '@angular/core';

export interface ExportConfig {
    filename: string;
    headers: string[];
    data: any[];
    dateRange?: {
        startDate: Date;
        endDate: Date;
    };
}

@Injectable({
    providedIn: 'root'
})
export class FileExportService {

    constructor() { }

    /**
     * Convert array of objects to CSV format
     */
    private convertToCSV(headers: string[], data: any[]): string {
        // Create header row
        const headerRow = headers.join(',');

        // Create data rows
        const dataRows = data.map(row => {
            return headers.map(header => {
                const value = row[header];
                // Handle values with commas, quotes, or newlines
                if (value === null || value === undefined) {
                    return '';
                }
                const stringValue = String(value);
                if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                    return `"${stringValue.replace(/"/g, '""')}"`;
                }
                return stringValue;
            }).join(',');
        });

        return [headerRow, ...dataRows].join('\n');
    }

    /**
     * Export data as CSV file
     */
    exportToCSV(config: ExportConfig): void {
        const csv = this.convertToCSV(config.headers, config.data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        // Create filename with date range if provided
        let filename = config.filename;
        if (config.dateRange) {
            const startDate = this.formatDateForFilename(config.dateRange.startDate);
            const endDate = this.formatDateForFilename(config.dateRange.endDate);
            filename = `${config.filename}_${startDate}_to_${endDate}`;
        }

        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Format date for filename (YYYY-MM-DD)
     */
    private formatDateForFilename(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Format date for API query parameter (ISO string or YYYY-MM-DD)
     */
    formatDateForQuery(date: Date): string {
        return this.formatDateForFilename(date);
    }

    /**
     * Parse date string to Date object
     */
    parseDate(dateString: string): Date {
        return new Date(dateString);
    }

    /**
     * Get current date in YYYY-MM-DD format for input element
     */
    getTodayAsString(): string {
        return this.formatDateForFilename(new Date());
    }

    /**
     * Get date from 30 days ago in YYYY-MM-DD format
     */
    get30DaysAgoAsString(): string {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return this.formatDateForFilename(date);
    }
}
