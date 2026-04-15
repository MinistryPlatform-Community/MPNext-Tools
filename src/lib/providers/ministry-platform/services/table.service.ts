import { MinistryPlatformClient } from "../client";
import { TableQueryParams, TableRecord, QueryParams } from "../types";
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