import { MinistryPlatformClient } from "../client";
import { TableMetadata } from "../types";
import { errorName, logger } from "../utils/logger";

export class MetadataService {
    private client: MinistryPlatformClient;

    constructor(client: MinistryPlatformClient) {
        this.client = client;
    }

    /**
     * Triggers an update of the metadata cache on all servers and in all applications.
     */
    public async refreshMetadata(): Promise<void> {
        try {
            await this.client.ensureValidToken();
            await this.client.getHttpClient().get<void>('/refreshMetadata');
        } catch (error) {
            logger.error('mp.metadata.refresh_failed', { error: errorName(error) });
            throw error;
        }
    }

    /**
     * Returns the list of tables available to the current user with basic metadata.
     */
    public async getTables(search?: string): Promise<TableMetadata[]> {
        try {
            await this.client.ensureValidToken();

            const params = search ? { $search: search } : undefined;
            return await this.client.getHttpClient().get<TableMetadata[]>('/tables', params);
        } catch (error) {
            logger.error('mp.metadata.get_tables_failed', { error: errorName(error) });
            throw error;
        }
    }
}