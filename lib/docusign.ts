import jwt from "jsonwebtoken";

const DOCUSIGN_AUTH_URL = "https://account-d.docusign.com/oauth/token";

/**
 * Get a DocuSign access token via JWT Grant flow.
 */
async function getAccessToken(): Promise<string> {
  const directToken = process.env.DOCUSIGN_ACCESS_TOKEN;
  if (directToken) return directToken;

  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
  const userId = process.env.DOCUSIGN_USER_ID;
  let privateKey = process.env.DOCUSIGN_PRIVATE_KEY;

  if (!integrationKey || !userId || !privateKey) {
    throw new Error("DocuSign requires DOCUSIGN_INTEGRATION_KEY, DOCUSIGN_USER_ID, DOCUSIGN_PRIVATE_KEY");
  }

  // Convert escaped newlines from env var
  privateKey = privateKey.replace(/\\n/g, "\n");

  // Create JWT assertion
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = {
    iss: integrationKey,
    sub: userId,
    aud: "account-d.docusign.com",
    iat: now,
    exp: now + 3600,
    scope: "signature impersonation",
  };

  const assertion = jwt.sign(jwtPayload, privateKey, { algorithm: "RS256" });

  // Exchange JWT for access token
  const tokenRes = await fetch(DOCUSIGN_AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${assertion}`,
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`DocuSign auth failed: ${err}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

/**
 * Send a DocuSign envelope (agreement) to a client for signing.
 * Returns the envelope ID.
 */
export async function sendAgreementEnvelope(
  clientName: string,
  clientEmail: string,
  businessName: string,
  plan: string,
  callbackUrl: string
): Promise<{ envelopeId: string }> {
  const accessToken = await getAccessToken();
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const basePath = process.env.DOCUSIGN_BASE_URL || "https://na4.docusign.net/restapi";

  if (!accountId) throw new Error("DOCUSIGN_ACCOUNT_ID is required");

  const templateId = process.env.DOCUSIGN_TEMPLATE_ID;
  if (!templateId) throw new Error("DOCUSIGN_TEMPLATE_ID is required");

  const envelopeBody = {
    templateId,
    emailSubject: "Your Zeno Automation Service Agreement",
    emailBlurb: `Hi ${clientName}, please review and sign your service agreement to get started with Zeno Automation.`,
    templateRoles: [
      {
        email: clientEmail,
        name: clientName,
        roleName: "Client",
      },
    ],
    status: "sent",
  };

  const res = await fetch(
    `${basePath}/v2.1/accounts/${accountId}/envelopes`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(envelopeBody),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DocuSign envelope failed: ${err}`);
  }

  const result = await res.json();
  console.log(`[DocuSign] Envelope sent: ${result.envelopeId} to ${clientEmail}`);
  return { envelopeId: result.envelopeId };
}

/**
 * Check the status of a DocuSign envelope.
 * Returns: "sent", "delivered", "completed", "declined", "voided", etc.
 */
export async function getEnvelopeStatus(envelopeId: string): Promise<string> {
  const accessToken = await getAccessToken();
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID!;
  const basePath = process.env.DOCUSIGN_BASE_URL || "https://demo.docusign.net/restapi";

  const res = await fetch(
    `${basePath}/v2.1/accounts/${accountId}/envelopes/${envelopeId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DocuSign status check failed: ${err}`);
  }

  const data = await res.json();
  return data.status || "unknown";
}
