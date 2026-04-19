import { MinistryPlatformClient } from "../client";
import { ProcedureInfo, QueryParams } from "../types";
import { HttpClient } from "../utils/http-client";
import { logger } from "../utils/logger";

const DEV_PROC_PREFIX = 'api_dev_';

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
     * Procedures whose name begins with `api_dev_` are routed through the isolated dev
     * credential pipeline — all other procedures use the default credentials.
     */
    public async executeProcedure(
        procedure: string,
        params?: QueryParams
    ): Promise<unknown[][]> {
        try {
            const http = await this.resolveHttpClient(procedure);

            logger.debug('Executing procedure:', procedure);
            logger.debug('Query Params:', params);

            const endpoint = `/procs/${encodeURIComponent(procedure)}`;
            const data = await http.get<unknown[][]>(endpoint, params);

            logger.debug('Procedure results:', data);
            return data;
        } catch (error) {
            logger.error(`Error executing procedure ${procedure}:`, error);
            throw error;
        }
    }

    /**
     * Executes the requested stored procedure with provided parameters in the request body.
     * Procedures whose name begins with `api_dev_` are routed through the isolated dev
     * credential pipeline — all other procedures use the default credentials.
     *
     * `queryParams` attaches to the URL — primarily for `$userId` audit attribution on
     * write procedures. The body `parameters` and the `queryParams` are independent;
     * MP treats them separately (body → SP params, query → API metadata).
     */
    public async executeProcedureWithBody(
        procedure: string,
        parameters: Record<string, unknown>,
        queryParams?: QueryParams
    ): Promise<unknown[][]> {
        try {
            const http = await this.resolveHttpClient(procedure);

            logger.debug('Executing procedure with body:', procedure);
            logger.debug('Parameters:', parameters);
            logger.debug('Query Params:', queryParams);

            const endpoint = `/procs/${encodeURIComponent(procedure)}`;
            const data = await http.post<unknown[][]>(endpoint, parameters, queryParams);

            logger.debug('Procedure results:', data);
            return data;
        } catch (error) {
            logger.error(`Error executing procedure ${procedure}:`, error);
            throw error;
        }
    }

    /**
     * Selects the credential pipeline for a procedure call:
     *   - `api_dev_*` procedures → dev credentials (isolated token + HttpClient)
     *   - everything else       → default credentials
     */
    private async resolveHttpClient(procedure: string): Promise<HttpClient> {
        if (isDevProcedure(procedure)) {
            await this.client.ensureValidDevToken();
            return this.client.getDevHttpClient();
        }

        await this.client.ensureValidToken();
        return this.client.getHttpClient();
    }
}

function isDevProcedure(procedure: string): boolean {
    return procedure.trim().toLowerCase().startsWith(DEV_PROC_PREFIX);
}
