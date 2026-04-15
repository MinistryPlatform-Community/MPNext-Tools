import { MinistryPlatformClient } from "../client";
import { ProcedureInfo, QueryParams } from "../types";
import { logger } from "../utils/logger";

export class ProcedureService {
    private client: MinistryPlatformClient;

    constructor(client: MinistryPlatformClient) {
        this.client = client;
    }

    /**
     * Returns the list of procedures available to the current user with basic metadata.
     */
    public async getProcedures(search?: string): Promise<ProcedureInfo[]> {
        try {
            await this.client.ensureValidToken();

            const params: QueryParams | undefined = search ? { $search: search } : undefined;
            return await this.client.getHttpClient().get<ProcedureInfo[]>('/procs', params);
        } catch (error) {
            logger.error('Error getting procedures:', error);
            throw error;
        }
    }

    /**
     * Executes the requested stored procedure retrieving parameters from the query string.
     */
    public async executeProcedure(
        procedure: string, 
        params?: QueryParams
    ): Promise<unknown[][]> {
        try {
            await this.client.ensureValidToken();

            logger.debug('Executing procedure:', procedure);
            logger.debug('Query Params:', params);

            const endpoint = `/procs/${encodeURIComponent(procedure)}`;
            const data = await this.client.getHttpClient().get<unknown[][]>(endpoint, params);

            logger.debug('Procedure results:', data);
            return data;
        } catch (error) {
            logger.error(`Error executing procedure ${procedure}:`, error);
            throw error;
        }
    }

    /**
     * Executes the requested stored procedure with provided parameters in the request body.
     */
    public async executeProcedureWithBody(
        procedure: string, 
        parameters: Record<string, unknown>
    ): Promise<unknown[][]> {
        try {
            await this.client.ensureValidToken();

            logger.debug('Executing procedure with body:', procedure);
            logger.debug('Parameters:', parameters);

            const endpoint = `/procs/${encodeURIComponent(procedure)}`;
            const data = await this.client.getHttpClient().post<unknown[][]>(endpoint, parameters);

            logger.debug('Procedure results:', data);
            return data;
        } catch (error) {
            logger.error(`Error executing procedure ${procedure}:`, error);
            throw error;
        }
    }
}