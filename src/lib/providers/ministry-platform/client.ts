import { getClientCredentialsToken } from "./auth/client-credentials";
import { HttpClient } from "./utils/http-client";
import { logger } from "./utils/logger";
import { getMpBaseUrl } from "@/lib/env";

// Token refresh interval - refresh 5 minutes before actual expiration for safety
const TOKEN_LIFE = 5 * 60 * 1000; // 5 minutes

/**
 * MinistryPlatformClient - Core HTTP client with automatic authentication management
 *
 * Manages OAuth2 client credentials authentication and provides a configured HttpClient
 * instance for all Ministry Platform API operations. Handles token lifecycle including
 * automatic refresh before expiration.
 *
 * Also manages a parallel, isolated dev-credentials token pipeline used exclusively for
 * executing `api_dev_*` stored procedures against a non-production MP environment. The
 * dev pipeline has its own token cache and HttpClient — it never affects the default
 * token or the default HttpClient, and no other endpoint in the provider is routed
 * through the dev pipeline.
 */
export class MinistryPlatformClient {
    // Default (production) credential pipeline
    private token: string = "";
    private expiresAt: Date = new Date(0);
    private httpClient: HttpClient;
    private refreshPromise: Promise<void> | null = null;

    // Dev credential pipeline — used only by ProcedureService for api_dev_* procs
    private devToken: string = "";
    private devExpiresAt: Date = new Date(0);
    private devHttpClient: HttpClient;
    private devRefreshPromise: Promise<void> | null = null;

    private baseUrl: string;

    /**
     * Creates a new MinistryPlatformClient instance
     * Initializes both the default and dev HTTP clients and sets up token management
     */
    constructor() {
        // Validated and normalized (see src/lib/env.ts); throws on a bad value.
        this.baseUrl = getMpBaseUrl();
        this.httpClient = new HttpClient(this.baseUrl, () => this.token);
        this.devHttpClient = new HttpClient(this.baseUrl, () => this.devToken);
    }

    /**
     * Ensures the default authentication token is valid and refreshes if necessary.
     * Call before making any default-pipeline API request.
     * @throws Error if token refresh fails
     */
    public async ensureValidToken(): Promise<void> {

        if (this.expiresAt >= new Date()) return;

        // Dedup concurrent callers: the first caller to find the token expired
        // starts the refresh; subsequent callers await the same in-flight promise.
        if (this.refreshPromise) return this.refreshPromise;


        this.refreshPromise = (async () => {
            try {
                const creds = await getClientCredentialsToken();
                this.token = creds.access_token;
                this.expiresAt = new Date(Date.now() + TOKEN_LIFE);

            } catch (error) {
                logger.error("Failed to refresh token:", error);
                throw error;
            } finally {
                this.refreshPromise = null;
            }
        })();

        return this.refreshPromise;
    }

    /**
     * Ensures the dev authentication token is valid and refreshes if necessary.
     * Call before making any dev-pipeline API request (api_dev_* procedure execution).
     * @throws Error if token refresh fails or dev credentials are not configured
     */
    public async ensureValidDevToken(): Promise<void> {

        if (this.devExpiresAt >= new Date()) return;

        // Dedup concurrent callers on the dev pipeline (symmetric with default pipeline).
        if (this.devRefreshPromise) return this.devRefreshPromise;


        this.devRefreshPromise = (async () => {
            try {
                const creds = await getClientCredentialsToken('dev');
                this.devToken = creds.access_token;
                this.devExpiresAt = new Date(Date.now() + TOKEN_LIFE);

            } catch (error) {
                logger.error("Failed to refresh dev token:", error);
                throw error;
            } finally {
                this.devRefreshPromise = null;
            }
        })();

        return this.devRefreshPromise;
    }

    /**
     * Returns the configured default HTTP client instance
     * @returns HttpClient bound to the default token
     */
    public getHttpClient(): HttpClient {
        return this.httpClient;
    }

    /**
     * Returns the dev-credentials HTTP client instance.
     * Only used by ProcedureService for executing `api_dev_*` stored procedures.
     * @returns HttpClient bound to the dev token
     */
    public getDevHttpClient(): HttpClient {
        return this.devHttpClient;
    }
}
