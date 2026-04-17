export type CredentialProfile = 'default' | 'dev';

export async function getClientCredentialsToken(profile: CredentialProfile = 'default') {
  const mpBaseUrl = process.env.MINISTRY_PLATFORM_BASE_URL!;
  const mpOauthUrl = `${mpBaseUrl}/oauth`;

  const { clientId, clientSecret } = resolveCredentials(profile);

  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "http://www.thinkministry.com/dataplatform/scopes/all",
  });

  const response = await fetch(`${mpOauthUrl}/connect/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Failed to get client credentials token: ${response.statusText}`);
  }

  return await response.json();
}

function resolveCredentials(profile: CredentialProfile): { clientId: string; clientSecret: string } {
  if (profile === 'dev') {
    const clientId = process.env.MINISTRY_PLATFORM_DEV_CLIENT_ID;
    const clientSecret = process.env.MINISTRY_PLATFORM_DEV_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error(
        'Dev client credentials are not configured. Set MINISTRY_PLATFORM_DEV_CLIENT_ID and MINISTRY_PLATFORM_DEV_CLIENT_SECRET to execute api_dev_* stored procedures.'
      );
    }
    return { clientId, clientSecret };
  }

  return {
    clientId: process.env.MINISTRY_PLATFORM_CLIENT_ID!,
    clientSecret: process.env.MINISTRY_PLATFORM_CLIENT_SECRET!,
  };
}
