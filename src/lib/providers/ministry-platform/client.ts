import { getClientCredentialsToken, type CredentialProfile } from "./auth/client-credentials";
import { HttpClient } from "./utils/http-client";
import { errorName, logger } from "./utils/logger";
import { getMpBaseUrl } from "@/lib/env";

// Token refresh interval - refresh well before the real (1 hour) expiration.
const TOKEN_LIFE = 5 * 60 * 1000; // 5 minutes

// After a failed refresh, fail fast for a short, jittered window instead of
// letting every concurrent caller hit a token endpoint that is already down.
export const NEGATIVE_CACHE_MIN_MS = 5 * 1000;
export const NEGATIVE_CACHE_JITTER_MS = 25 * 1000;

/**
 * One credential pipeline: a cached token, a single-flight refresh shared by
 * concurrent callers, a negative cache after a failed refresh, and a 401 hook
 * that invalidates the token the API just rejected.
 */
class TokenPipeline {
    token = "";
    private expiresAt = 0; // epoch ms; 0 forces the first refresh
    private inflight: Promise<void> | null = null;
    private failedUntil = 0; // epoch ms before which refreshes are not re-attempted
    readonly httpClient: HttpClient;

    constructor(baseUrl: string, private readonly profile: CredentialProfile) {
        this.httpClient = new HttpClient(
            baseUrl,
            () => this.token,
            (rejectedToken) => this.handleUnauthorized(rejectedToken)
        );
    }

    async ensureValid(): Promise<void> {
        if (this.expiresAt >= Date.now()) return;

        // Dedup concurrent callers: the first caller to find the token expired
        // starts the refresh; subsequent callers await the same promise.
        if (!this.inflight) {
            if (Date.now() < this.failedUntil) {
                throw new Error("MP access token unavailable: recent refresh failed");
            }
            this.inflight = this.refresh().finally(() => {
                this.inflight = null;
            });
        }
        return this.inflight;
    }

    private async refresh(): Promise<void> {
        try {
            // Validated in getClientCredentialsToken: non-empty access_token,
            // bearer token_type.
            const creds = await getClientCredentialsToken(this.profile);
            this.token = creds.access_token;
            this.expiresAt = Date.now() + TOKEN_LIFE;
            this.failedUntil = 0;
        } catch (error) {
            this.failedUntil =
                Date.now() + NEGATIVE_CACHE_MIN_MS + Math.floor(Math.random() * NEGATIVE_CACHE_JITTER_MS);
            // Name only: never the raw error, which could carry response content.
            logger.error("mp.token.refresh_failed", { profile: this.profile, error: errorName(error) });
            throw error;
        }
    }

    private async handleUnauthorized(rejectedToken: string): Promise<void> {
        // Only invalidate if nobody has replaced the token since it was sent,
        // so a burst of 401s for one stale token triggers a single refresh.
        if (this.token === rejectedToken) {
            this.expiresAt = 0;
        }
        await this.ensureValid();
    }
}

/**
 * MinistryPlatformClient - Core HTTP client with automatic authentication management
 *
 * Manages OAuth2 client credentials authentication and provides a configured HttpClient
 * instance for all Ministry Platform API operations. Handles token lifecycle including
 * automatic refresh before expiration, one shared refresh for concurrent callers, a
 * short negative cache after a failed refresh, and a forced refresh + single retry when
 * the API rejects the token with a 401.
 *
 * Also manages a parallel, isolated dev-credentials token pipeline used exclusively for
 * executing `api_dev_*` stored procedures against a non-production MP environment. The
 * dev pipeline has its own token cache and HttpClient — it never affects the default
 * token or the default HttpClient, and no other endpoint in the provider is routed
 * through the dev pipeline.
 */
export class MinistryPlatformClient {
    private readonly main: TokenPipeline;
    private readonly dev: TokenPipeline;

    /**
     * Creates a new MinistryPlatformClient instance
     * Initializes both the default and dev HTTP clients and sets up token management
     */
    constructor() {
        // Validated and normalized (see src/lib/env.ts); throws on a bad value.
        const baseUrl = getMpBaseUrl();
        this.main = new TokenPipeline(baseUrl, 'default');
        this.dev = new TokenPipeline(baseUrl, 'dev');
    }

    /**
     * Ensures the default authentication token is valid and refreshes if necessary.
     * Call before making any default-pipeline API request.
     * @throws Error if token refresh fails (or failed within the negative-cache window)
     */
    public async ensureValidToken(): Promise<void> {
        return this.main.ensureValid();
    }

    /**
     * Ensures the dev authentication token is valid and refreshes if necessary.
     * Call before making any dev-pipeline API request (api_dev_* procedure execution).
     * @throws Error if token refresh fails or dev credentials are not configured
     */
    public async ensureValidDevToken(): Promise<void> {
        return this.dev.ensureValid();
    }

    /**
     * Returns the configured default HTTP client instance
     * @returns HttpClient bound to the default token
     */
    public getHttpClient(): HttpClient {
        return this.main.httpClient;
    }

    /**
     * Returns the dev-credentials HTTP client instance.
     * Only used by ProcedureService for executing `api_dev_*` stored procedures.
     * @returns HttpClient bound to the dev token
     */
    public getDevHttpClient(): HttpClient {
        return this.dev.httpClient;
    }
}
