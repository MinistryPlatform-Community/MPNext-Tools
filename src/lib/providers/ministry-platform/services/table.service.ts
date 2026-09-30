import { MinistryPlatformClient } from "../client";
import { TableQueryParams, TableRecord, QueryParams, RecurrencePattern, CopyParameters } from "../types";
import { logger } from "../utils/logger";
import { errorName, sanitizeRecordId, tableEndpoint } from "./guards";

/*
 * Path segments are validated (identifier / positive integer) BEFORE the try
 * block, so a bad value throws a fixed message before any token or network
 * work, and so every value that reaches a log line is a validated identifier.
 * Errors are logged as { table, recordId?, error: <class name> } — never the
 * raw error, whose message can carry a response-body fragment.
 */
export class TableService {
    private client: MinistryPlatformClient;

    constructor(client: MinistryPlatformClient) {
        this.client = client;
    }

    /**
     * Returns the list of records from the specified table satisfying the provided search criteria.
     */
    public async getTableRecords<T>(table: string, params?: TableQueryParams): Promise<T[]> {
        const endpoint = tableEndpoint(table);
        try {
            await this.client.ensureValidToken();
            return await this.client.getHttpClient().get<T[]>(endpoint, params as QueryParams);
        } catch (error) {
            logger.error('mp.table.get_failed', { table, error: errorName(error) });
            throw error;
        }
    }

    /**
     * Creates new records in the specified table.
     */
    public async createTableRecords<T extends TableRecord = TableRecord>(
        table: string,
        records: T[],
        params?: Pick<TableQueryParams, '$select' | '$userId'>
    ): Promise<T[]> {
        const endpoint = tableEndpoint(table);
        try {
            await this.client.ensureValidToken();
            return await this.client.getHttpClient().post<T[]>(endpoint, records as unknown as Record<string, unknown>, params);
        } catch (error) {
            logger.error('mp.table.create_failed', { table, error: errorName(error) });
            throw error;
        }
    }

    /**
     * Updates provided records in the specified table.
     */
    public async updateTableRecords<T extends TableRecord = TableRecord>(
        table: string,
        records: T[],
        params?: Pick<TableQueryParams, '$select' | '$userId' | '$allowCreate'>
    ): Promise<T[]> {
        const endpoint = tableEndpoint(table);
        try {
            await this.client.ensureValidToken();
            return await this.client.getHttpClient().put<T[]>(endpoint, records as unknown as Record<string, unknown>, params);
        } catch (error) {
            logger.error('mp.table.update_failed', { table, error: errorName(error) });
            throw error;
        }
    }

    /**
     * Creates copies of a record using a recurrence pattern.
     * Does NOT copy related sub-pages or attached files.
     * Creates dp_Sequences entries for native MP series linkage.
     *
     * @see POST /tables/{table}/{recordId}/copy
     */
    public async copyRecord<T extends TableRecord = TableRecord>(
        table: string,
        recordId: number,
        pattern: RecurrencePattern,
        params?: Pick<TableQueryParams, '$select' | '$userId'>
    ): Promise<T[]> {
        const id = sanitizeRecordId(recordId, 'record ID');
        const endpoint = `${tableEndpoint(table)}/${id}/copy`;
        try {
            await this.client.ensureValidToken();
            return await this.client.getHttpClient().post<T[]>(
                endpoint,
                pattern as unknown as Record<string, unknown>,
                params as QueryParams
            );
        } catch (error) {
            logger.error('mp.table.copy_failed', { table, recordId: id, error: errorName(error) });
            throw error;
        }
    }

    /**
     * Creates copies of a record using a recurrence pattern.
     * Allows copying related sub-pages and attached files.
     * Creates dp_Sequences entries for native MP series linkage.
     *
     * @see POST /tables/{table}/{recordId}/copy-record
     */
    public async copyRecordWithSubpages<T extends TableRecord = TableRecord>(
        table: string,
        recordId: number,
        copyParams: CopyParameters,
        params?: Pick<TableQueryParams, '$select' | '$userId'>
    ): Promise<T[]> {
        const id = sanitizeRecordId(recordId, 'record ID');
        const endpoint = `${tableEndpoint(table)}/${id}/copy-record`;
        try {
            await this.client.ensureValidToken();
            return await this.client.getHttpClient().post<T[]>(
                endpoint,
                copyParams as unknown as Record<string, unknown>,
                params as QueryParams
            );
        } catch (error) {
            logger.error('mp.table.copy_with_subpages_failed', { table, recordId: id, error: errorName(error) });
            throw error;
        }
    }

    /**
     * Deletes multiple records from the specified table.
     */
    public async deleteTableRecords<T extends TableRecord = TableRecord>(
        table: string,
        ids: number[],
        params?: Pick<TableQueryParams, '$select' | '$userId'>
    ): Promise<T[]> {
        const endpoint = tableEndpoint(table);
        // Each id becomes an `id=` query value; refuse anything that is not a
        // list of positive integers before anything is sent.
        if (!Array.isArray(ids)) {
            throw new Error('Invalid record IDs');
        }
        const safeIds = ids.map((id) => sanitizeRecordId(id, 'record ID'));
        try {
            await this.client.ensureValidToken();

            // Combine the ids and other params
            const queryParams = { ...params, id: safeIds };
            return await this.client.getHttpClient().delete<T[]>(endpoint, queryParams);
        } catch (error) {
            logger.error('mp.table.delete_failed', { table, count: safeIds.length, error: errorName(error) });
            throw error;
        }
    }
}
