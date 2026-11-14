import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { apiRequest } from "./apiClient.ts";
import type { ScanVerificationResult } from "../types.ts";

export type HardwareSdkProvider = "secugen" | "zkteco" | "digitalpersona";

export interface BiometricCapabilityStatus {
  webauthnSupported: boolean;
  platformAuthenticatorAvailable: boolean;
}

export async function checkBiometricCapabilities(): Promise<BiometricCapabilityStatus> {
  const webauthnSupported = browserSupportsWebAuthn();
  let platformAuthenticatorAvailable = false;
  if (
    webauthnSupported &&
    typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable ===
      "function"
  ) {
    try {
      platformAuthenticatorAvailable =
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      platformAuthenticatorAvailable = false;
    }
  }
  return { webauthnSupported, platformAuthenticatorAvailable };
}

export async function enrollWebAuthnFingerprint(
  memberId: string,
  deviceLabel: string,
): Promise<void> {
  if (!browserSupportsWebAuthn()) {
    throw new Error(
      "This browser or context does not support WebAuthn biometric hardware.",
    );
  }

  const { challengeId, options } = await apiRequest<{
    challengeId: string;
    options: PublicKeyCredentialCreationOptionsJSON;
  }>("/api/biometrics/webauthn/register-options", {
    method: "POST",
    body: JSON.stringify({ memberId }),
  });

  const registrationResponse = await startRegistration({
    optionsJSON: options,
  });

  await apiRequest("/api/biometrics/webauthn/register-verify", {
    method: "POST",
    body: JSON.stringify({
      challengeId,
      memberId,
      response: registrationResponse,
      deviceLabel,
    }),
  });
}

export async function verifyWebAuthnFingerprint(
  deviceLabel: string,
  memberId?: string,
): Promise<ScanVerificationResult> {
  if (!browserSupportsWebAuthn()) {
    throw new Error(
      "This browser or context does not support WebAuthn biometric hardware.",
    );
  }

  const { challengeId, options } = await apiRequest<{
    challengeId: string;
    options: PublicKeyCredentialRequestOptionsJSON;
  }>("/api/biometrics/webauthn/verify-options", {
    method: "POST",
    body: JSON.stringify({ memberId: memberId || undefined }),
  });

  const authResponse = await startAuthentication({ optionsJSON: options });

  return apiRequest<ScanVerificationResult>("/api/biometrics/webauthn/verify", {
    method: "POST",
    body: JSON.stringify({
      challengeId,
      response: authResponse,
      deviceLabel,
    }),
  });
}

export function getDefaultSdkEndpoint(provider: HardwareSdkProvider): string {
  switch (provider) {
    case "secugen":
      return "https://localhost:8443/SGIFPCapture";
    case "zkteco":
      return "http://127.0.0.1:22001/zkbioonline/fingerprint/beginCapture";
    case "digitalpersona":
      return "https://127.0.0.1:52181/api/v1/capture";
  }
}

export async function captureTemplateFromHardwareSdk(
  provider: HardwareSdkProvider,
  endpointUrl: string,
): Promise<string> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Timeout: 10000,
        Quality: 50,
        TemplateFormat: "ISO",
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Scanner SDK responded with HTTP ${response.status}`);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const templateData =
      (typeof payload.TemplateBase64 === "string" && payload.TemplateBase64) ||
      (typeof payload.ISOTemplateBase64 === "string" &&
        payload.ISOTemplateBase64) ||
      (typeof payload.templateData === "string" && payload.templateData) ||
      (typeof payload.data === "string" && payload.data) ||
      "";

    if (!templateData || templateData.trim().length < 32) {
      const sdkError =
        (typeof payload.ErrorMessage === "string" && payload.ErrorMessage) ||
        (typeof payload.error === "string" && payload.error) ||
        "Scanner device did not return a valid biometric template.";
      throw new Error(sdkError);
    }

    return templateData;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(
        `Timed out waiting for finger placement on ${provider.toUpperCase()} scanner.`,
      );
    }
    if (err instanceof TypeError) {
      throw new Error(
        `Unable to connect to ${provider.toUpperCase()} local hardware SDK daemon at ${endpointUrl}. Ensure the vendor USB driver service is running.`,
      );
    }
    throw err;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function enrollHardwareSdkFingerprint(
  memberId: string,
  provider: HardwareSdkProvider,
  endpointUrl: string,
  deviceLabel: string,
): Promise<void> {
  const templateData = await captureTemplateFromHardwareSdk(
    provider,
    endpointUrl,
  );
  await apiRequest("/api/biometrics/sdk/enroll", {
    method: "POST",
    body: JSON.stringify({ memberId, provider, templateData, deviceLabel }),
  });
}

export async function verifyHardwareSdkFingerprint(
  provider: HardwareSdkProvider,
  endpointUrl: string,
  deviceLabel: string,
): Promise<ScanVerificationResult> {
  const templateData = await captureTemplateFromHardwareSdk(
    provider,
    endpointUrl,
  );
  return apiRequest<ScanVerificationResult>("/api/biometrics/sdk/verify", {
    method: "POST",
    body: JSON.stringify({ provider, templateData, deviceLabel }),
  });
}

export async function listMemberBiometrics(memberId: string): Promise<
  Array<{
    id: string;
    provider: string;
    credential_id: string;
    device_label: string;
    counter: number;
    created_at: string;
  }>
> {
  const res = await apiRequest<{
    credentials: Array<{
      id: string;
      provider: string;
      credential_id: string;
      device_label: string;
      counter: number;
      created_at: string;
    }>;
  }>(`/api/biometrics/member/${encodeURIComponent(memberId)}`);
  return res.credentials;
}

export async function removeBiometricCredential(
  credentialRecordId: string,
): Promise<void> {
  await apiRequest(
    `/api/biometrics/${encodeURIComponent(credentialRecordId)}`,
    {
      method: "DELETE",
    },
  );
}
