import { MinistryPlatformClient } from "../client";
import { TableQueryParams, TableRecord, QueryParams, RecurrencePattern, CopyParameters } from "../types";
import { logger } from "../utils/logger";

export class TableService {
    private client: MinistryPlatformClient;

    constructor(client: MinistryPlatformClient) {
        this.client = client;
    }

    /**
     * Returns the list of records from the specified table satisfying the provided search criteria.
     */
        public async getTableRecords<T>(table: string, params?: TableQueryParams): Promise<T[]> {
            try {
                await this.client.ensureValidToken();

                logger.debug('Fetching records from table:', table);
                logger.debug('Query Params:', params);

                const endpoint = `/tables/${encodeURIComponent(table)}`;
                const data = await this.client.getHttpClient().get<T[]>(endpoint, params as QueryParams);
        
                logger.debug('Fetched records:', data);
                return data;
            } catch (error) {
                logger.error(`Error fetching records from table ${table}:`, error);
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
        try {
            await this.client.ensureValidToken();

            const endpoint = `/tables/${encodeURIComponent(table)}`;
            const result = await this.client.getHttpClient().post<T[]>(endpoint, records as unknown as Record<string, unknown>, params);
            return result;
        } catch (error) {
            logger.error(`Error creating records in table ${table}:`, error);
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
        try {
            await this.client.ensureValidToken();

            const endpoint = `/tables/${encodeURIComponent(table)}`;
            const result = await this.client.getHttpClient().put<T[]>(endpoint, records as unknown as Record<string, unknown>, params);
            return result;
        } catch (error) {
            logger.error(`Error updating records in table ${table}:`, error);
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
        try {
            await this.client.ensureValidToken();

            const endpoint = `/tables/${encodeURIComponent(table)}/${recordId}/copy`;
            const result = await this.client.getHttpClient().post<T[]>(
                endpoint,
                pattern as unknown as Record<string, unknown>,
                params as QueryParams
            );
            return result;
        } catch (error) {
            logger.error(`Error copying record ${recordId} in table ${table}:`, error);
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
        try {
            await this.client.ensureValidToken();

            const endpoint = `/tables/${encodeURIComponent(table)}/${recordId}/copy-record`;
            const result = await this.client.getHttpClient().post<T[]>(
                endpoint,
                copyParams as unknown as Record<string, unknown>,
                params as QueryParams
            );
            return result;
        } catch (error) {
            logger.error(`Error copying record ${recordId} with subpages in table ${table}:`, error);
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
        try {
            await this.client.ensureValidToken();

            // Combine the ids and other params
            const queryParams = { ...params, id: ids };
            const endpoint = `/tables/${encodeURIComponent(table)}`;
            
            const result = await this.client.getHttpClient().delete<T[]>(endpoint, queryParams);
            return result;
        } catch (error) {
            logger.error(`Error deleting records from table ${table}:`, error);
            throw error;
        }
    }
}