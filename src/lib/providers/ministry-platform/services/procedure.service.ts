import { MinistryPlatformClient } from "../client";
import { ProcedureInfo, QueryParams } from "../types";
import { HttpClient } from "../utils/http-client";
import { errorName, logger } from "../utils/logger";
import { sanitizeIdentifier } from "./guards";

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
            logger.error('mp.procs.list_failed', { error: errorName(error) });
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
        // Validated before any token or network work; the name is then safe to log.
        const name = sanitizeIdentifier(procedure, 'procedure name');
        const endpoint = `/procs/${encodeURIComponent(name)}`;
        try {
            const http = await this.resolveHttpClient(name);
            const data = await http.get<unknown[][]>(endpoint, params);

            return data;
        } catch (error) {
            logger.error('mp.procs.execute_failed', { procedure: name, error: errorName(error) });
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
        // Validated before any token or network work; the name is then safe to log.
        const name = sanitizeIdentifier(procedure, 'procedure name');
        const endpoint = `/procs/${encodeURIComponent(name)}`;
        try {
            const http = await this.resolveHttpClient(name);
            const data = await http.post<unknown[][]>(endpoint, parameters, queryParams);

            return data;
        } catch (error) {
            logger.error('mp.procs.execute_failed', { procedure: name, error: errorName(error) });
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
    return procedure.toLowerCase().startsWith(DEV_PROC_PREFIX);
}
