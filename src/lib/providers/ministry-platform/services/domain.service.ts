import { MinistryPlatformClient } from "../client";
import { DomainInfo, GlobalFilterItem, GlobalFilterParams, QueryParams } from "../types";
import { errorName, logger } from "../utils/logger";
import { sanitizeRecordId } from "./guards";

export class DomainService {
    private client: MinistryPlatformClient;

    constructor(client: MinistryPlatformClient) {
        this.client = client;
    }

    /**
     * Returns the basic information about the current domain.
     * @returns Promise with the domain information
     */
    public async getDomainInfo(): Promise<DomainInfo> {
        try {
            await this.client.ensureValidToken();
            return await this.client.getHttpClient().get('/domain');
        } catch (error) {
            logger.error('mp.domain.get_info_failed', { error: errorName(error) });
            throw error;
        }
    }

    /**
     * Returns the lookup values to be used as global filters. The key corresponds to
     * an identifier and the value corresponds to a friendly name (description). Zero (0)
     * identifier corresponds to records with not assigned filters.
     *
     * Only `$userId` is forwarded. `$ignorePermissions` is deliberately
     * dropped (and removed from the type): the request already runs as the
     * admin-level service account, and nothing in the app needs MP to widen
     * that further. An allowlist, not a pass-through, so an untyped caller
     * that smuggles the flag in still does not get it.
     *
     * @param params Optional parameters for the global filters request
     * @returns Promise with an array of global filter items
     */
    public async getGlobalFilters(params?: GlobalFilterParams): Promise<GlobalFilterItem[]> {
        const query: QueryParams = {};
        if (params?.$userId !== undefined) {
            query.$userId = sanitizeRecordId(params.$userId, 'user ID');
        }
        try {
            await this.client.ensureValidToken();
            return await this.client.getHttpClient().get('/domain/filters', query);
        } catch (error) {
            logger.error('mp.domain.get_global_filters_failed', { error: errorName(error) });
            throw error;
        }
    }
}