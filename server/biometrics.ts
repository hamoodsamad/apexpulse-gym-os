import crypto from "node:crypto";
import type { Request, Router } from "express";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransport,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { execute, query, queryOne } from "./db.ts";
import { requireAdmin, requireAuth } from "./auth.ts";
import { nowIso } from "./dates.ts";
import { evaluateMemberAccessState } from "./syncExpiry.ts";
import type {
  BiometricProvider,
  DbBiometricCredential,
  DbMember,
} from "./types.ts";

function getRpConfig(req: Request): {
  rpName: string;
  rpID: string;
  expectedOrigin: string;
} {
  const rpName = process.env.RP_NAME?.trim() || "ApexPulse Gym OS";
  const originHeader = req.headers.origin;
  const forwardedProto = (
    req.headers["x-forwarded-proto"] as string | undefined
  )
    ?.split(",")[0]
    ?.trim();
  const forwardedHost = (req.headers["x-forwarded-host"] as string | undefined)
    ?.split(",")[0]
    ?.trim();
  const hostHeader = forwardedHost || req.headers.host || "localhost:3000";
  const proto =
    forwardedProto ||
    (hostHeader.includes("localhost") || hostHeader.includes("127.0.0.1")
      ? "http"
      : "https");

  let origin =
    originHeader || process.env.APP_URL?.trim() || `${proto}://${hostHeader}`;
  if (origin.endsWith("/")) {
    origin = origin.slice(0, -1);
  }

  let rpID = process.env.RP_ID?.trim() || "";
  if (!rpID) {
    try {
      rpID = new URL(origin).hostname;
    } catch {
      rpID = hostHeader.split(":")[0];
    }
  }
  return { rpName, rpID, expectedOrigin: origin };
}

async function recordAttendanceAndBuildResult(
  memberId: string,
  method: "webauthn" | "hardware_sdk",
  deviceLabel: string,
) {
  const evaluation = await evaluateMemberAccessState(memberId);
  if (!evaluation) return null;

  const attendanceId = `att_${crypto.randomUUID().slice(0, 12)}`;
  const scannedAt = nowIso();

  await execute(
    `INSERT INTO attendance (id, member_id, subscription_id, verification_method, verification_result, device_label, scanned_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      attendanceId,
      evaluation.member.id,
      evaluation.latestSubscription?.id ?? null,
      method,
      evaluation.verificationResult,
      deviceLabel,
      scannedAt,
    ],
  );

  return {
    attendanceId,
    scannedAt,
    verificationMethod: method,
    verificationResult: evaluation.verificationResult,
    statusLabel: evaluation.statusLabel,
    reason: evaluation.reason,
    deviceLabel,
    member: {
      id: evaluation.member.id,
      memberCode: evaluation.member.member_code,
      fullName: evaluation.member.full_name,
      phone: evaluation.member.phone,
      age: Number(evaluation.member.age),
      status: evaluation.member.status,
    },
    subscription: evaluation.latestSubscription
      ? {
          id: evaluation.latestSubscription.id,
          packageName: evaluation.latestSubscription.package_name,
          duration: evaluation.latestSubscription.duration,
          startDate: evaluation.latestSubscription.start_date,
          expiryDate: evaluation.latestSubscription.expiry_date,
          status: evaluation.latestSubscription.status,
          paymentStatus: evaluation.latestSubscription.payment_status,
        }
      : null,
    payment: evaluation.latestPayment
      ? {
          id: evaluation.latestPayment.id,
          amount: Number(evaluation.latestPayment.amount),
          status: evaluation.latestPayment.status,
          method: evaluation.latestPayment.method,
          paidAt: evaluation.latestPayment.paid_at,
        }
      : null,
  };
}

export function registerBiometricRoutes(router: Router): void {
  // List biometric enrollments for a member (Admin only)
  router.get(
    "/biometrics/member/:memberId",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      const rows = await query<DbBiometricCredential>(
        "SELECT id, member_id, provider, credential_id, device_label, counter, created_at FROM biometric_credentials WHERE member_id = ? ORDER BY created_at DESC",
        [req.params.memberId],
      );
      res.json({ credentials: rows });
    },
  );

  // Delete an enrolled biometric credential (Admin only)
  router.delete(
    "/biometrics/:id",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      const existing = await queryOne<DbBiometricCredential>(
        "SELECT * FROM biometric_credentials WHERE id = ?",
        [req.params.id],
      );
      if (!existing) {
        res.status(404).json({ error: "Biometric credential not found" });
        return;
      }
      await execute("DELETE FROM biometric_credentials WHERE id = ?", [
        req.params.id,
      ]);
      res.json({ ok: true });
    },
  );

  // WebAuthn Step 1: Generate registration options
  router.post(
    "/biometrics/webauthn/register-options",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      const { memberId } = req.body as { memberId?: string };
      if (!memberId) {
        res.status(400).json({ error: "memberId is required" });
        return;
      }
      const member = await queryOne<DbMember>(
        "SELECT * FROM members WHERE id = ?",
        [memberId],
      );
      if (!member) {
        res.status(404).json({ error: "Member not found" });
        return;
      }

      const existingCreds = await query<DbBiometricCredential>(
        `SELECT * FROM biometric_credentials WHERE member_id = ? AND provider = 'webauthn'`,
        [member.id],
      );

      const { rpName, rpID } = getRpConfig(req);
      const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userName: member.email,
        userDisplayName: member.full_name,
        userID: new Uint8Array(Buffer.from(member.id, "utf8")),
        attestationType: "none",
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "required",
        },
        excludeCredentials: existingCreds.map((c) => ({
          id: c.credential_id,
          transports: JSON.parse(
            c.transports || "[]",
          ) as AuthenticatorTransport[],
        })),
      });

      const challengeId = `chl_${crypto.randomUUID().slice(0, 12)}`;
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      await execute(
        `INSERT INTO webauthn_challenges (id, challenge, purpose, member_id, expires_at, created_at) VALUES (?, ?, 'register', ?, ?, ?)`,
        [challengeId, options.challenge, member.id, expiresAt, nowIso()],
      );

      res.json({ challengeId, options });
    },
  );

  // WebAuthn Step 2: Verify registration response and store credential
  router.post(
    "/biometrics/webauthn/register-verify",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      const { challengeId, memberId, response, deviceLabel } = req.body as {
        challengeId?: string;
        memberId?: string;
        response?: RegistrationResponseJSON;
        deviceLabel?: string;
      };

      if (!challengeId || !memberId || !response) {
        res
          .status(400)
          .json({ error: "challengeId, memberId, and response are required" });
        return;
      }

      const challengeRow = await queryOne<{
        challenge: string;
        member_id: string;
        expires_at: string;
      }>(
        `SELECT challenge, member_id, expires_at FROM webauthn_challenges WHERE id = ? AND purpose = 'register'`,
        [challengeId],
      );

      if (!challengeRow || challengeRow.member_id !== memberId) {
        res.status(400).json({
          error: "Biometric enrollment challenge not found or mismatched",
        });
        return;
      }

      if (challengeRow.expires_at < nowIso()) {
        await execute("DELETE FROM webauthn_challenges WHERE id = ?", [
          challengeId,
        ]);
        res
          .status(400)
          .json({ error: "Biometric enrollment challenge expired" });
        return;
      }

      const { rpID, expectedOrigin } = getRpConfig(req);
      try {
        const verification = await verifyRegistrationResponse({
          response,
          expectedChallenge: challengeRow.challenge,
          expectedOrigin,
          expectedRPID: rpID,
          requireUserVerification: true,
        });

        await execute("DELETE FROM webauthn_challenges WHERE id = ?", [
          challengeId,
        ]);

        if (!verification.verified || !verification.registrationInfo) {
          res
            .status(400)
            .json({ error: "Hardware biometric verification failed" });
          return;
        }

        const { credential } = verification.registrationInfo;
        const publicKeyBase64 = Buffer.from(credential.publicKey).toString(
          "base64url",
        );
        const credRecordId = `bio_${crypto.randomUUID().slice(0, 12)}`;

        await execute(
          `INSERT INTO biometric_credentials (id, member_id, provider, credential_id, public_key, counter, transports, device_label, template_hash, created_at)
         VALUES (?, ?, 'webauthn', ?, ?, ?, ?, ?, '', ?)`,
          [
            credRecordId,
            memberId,
            credential.id,
            publicKeyBase64,
            credential.counter,
            JSON.stringify(credential.transports || []),
            (deviceLabel || "WebAuthn Biometric Sensor").trim().slice(0, 80),
            nowIso(),
          ],
        );

        res
          .status(201)
          .json({ verified: true, credentialRecordId: credRecordId });
      } catch (err) {
        res.status(400).json({
          error:
            err instanceof Error ? err.message : "WebAuthn registration failed",
        });
      }
    },
  );

  // WebAuthn Step 3: Generate verification options
  router.post(
    "/biometrics/webauthn/verify-options",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      const { memberId } = (req.body || {}) as { memberId?: string };

      const creds = memberId
        ? await query<DbBiometricCredential>(
            `SELECT * FROM biometric_credentials WHERE member_id = ? AND provider = 'webauthn'`,
            [memberId],
          )
        : await query<DbBiometricCredential>(
            `SELECT * FROM biometric_credentials WHERE provider = 'webauthn'`,
          );

      if (creds.length === 0) {
        res.status(404).json({
          error: memberId
            ? "This member has no WebAuthn fingerprint credential enrolled."
            : "No members have enrolled WebAuthn biometric credentials yet.",
        });
        return;
      }

      const { rpID } = getRpConfig(req);
      const options = await generateAuthenticationOptions({
        rpID,
        userVerification: "required",
        allowCredentials: creds.map((c) => ({
          id: c.credential_id,
          transports: JSON.parse(
            c.transports || "[]",
          ) as AuthenticatorTransport[],
        })),
      });

      const challengeId = `chl_${crypto.randomUUID().slice(0, 12)}`;
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      await execute(
        `INSERT INTO webauthn_challenges (id, challenge, purpose, member_id, expires_at, created_at) VALUES (?, ?, 'verify', ?, ?, ?)`,
        [challengeId, options.challenge, memberId || null, expiresAt, nowIso()],
      );

      res.json({ challengeId, options });
    },
  );

  // WebAuthn Step 4: Verify hardware scan assertion
  router.post(
    "/biometrics/webauthn/verify",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      const { challengeId, response, deviceLabel } = req.body as {
        challengeId?: string;
        response?: AuthenticationResponseJSON;
        deviceLabel?: string;
      };

      if (!challengeId || !response) {
        res
          .status(400)
          .json({ error: "challengeId and response are required" });
        return;
      }

      const challengeRow = await queryOne<{
        challenge: string;
        expires_at: string;
      }>(
        `SELECT challenge, expires_at FROM webauthn_challenges WHERE id = ? AND purpose = 'verify'`,
        [challengeId],
      );

      if (!challengeRow) {
        res.status(400).json({ error: "Verification challenge not found" });
        return;
      }

      if (challengeRow.expires_at < nowIso()) {
        await execute("DELETE FROM webauthn_challenges WHERE id = ?", [
          challengeId,
        ]);
        res.status(400).json({ error: "Verification challenge expired" });
        return;
      }

      const cred = await queryOne<DbBiometricCredential>(
        `SELECT * FROM biometric_credentials WHERE credential_id = ? AND provider = 'webauthn'`,
        [response.id],
      );

      if (!cred) {
        res.status(404).json({
          error: "Unrecognized biometric credential. Member not found.",
        });
        return;
      }

      const { rpID, expectedOrigin } = getRpConfig(req);
      try {
        const verification = await verifyAuthenticationResponse({
          response,
          expectedChallenge: challengeRow.challenge,
          expectedOrigin,
          expectedRPID: rpID,
          requireUserVerification: true,
          credential: {
            id: cred.credential_id,
            publicKey: new Uint8Array(
              Buffer.from(cred.public_key, "base64url"),
            ),
            counter: Number(cred.counter),
            transports: JSON.parse(
              cred.transports || "[]",
            ) as AuthenticatorTransport[],
          },
        });

        await execute("DELETE FROM webauthn_challenges WHERE id = ?", [
          challengeId,
        ]);

        if (!verification.verified) {
          res
            .status(401)
            .json({ error: "Biometric assertion verification failed" });
          return;
        }

        await execute(
          "UPDATE biometric_credentials SET counter = ? WHERE id = ?",
          [verification.authenticationInfo.newCounter, cred.id],
        );

        const result = await recordAttendanceAndBuildResult(
          cred.member_id,
          "webauthn",
          (
            deviceLabel ||
            cred.device_label ||
            "WebAuthn Fingerprint Sensor"
          ).slice(0, 80),
        );

        if (!result) {
          res
            .status(404)
            .json({ error: "Member profile not found for credential" });
          return;
        }

        res.json(result);
      } catch (err) {
        res.status(400).json({
          error:
            err instanceof Error ? err.message : "Biometric verification error",
        });
      }
    },
  );

  // Dedicated USB Scanner Local SDK Bridge Enrollment
  router.post(
    "/biometrics/sdk/enroll",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      const { memberId, provider, templateData, deviceLabel } = req.body as {
        memberId?: string;
        provider?: BiometricProvider;
        templateData?: string;
        deviceLabel?: string;
      };

      if (
        !memberId ||
        !provider ||
        !templateData ||
        templateData.trim().length < 32
      ) {
        res.status(400).json({
          error:
            "Valid hardware biometric templateData captured from scanner SDK is required (minimum 32 chars).",
        });
        return;
      }

      if (!["secugen", "zkteco", "digitalpersona"].includes(provider)) {
        res
          .status(400)
          .json({ error: "Unsupported hardware scanner SDK provider" });
        return;
      }

      const member = await queryOne<DbMember>(
        "SELECT * FROM members WHERE id = ?",
        [memberId],
      );
      if (!member) {
        res.status(404).json({ error: "Member not found" });
        return;
      }

      const templateHash = crypto
        .createHash("sha256")
        .update(templateData.trim())
        .digest("hex");
      const existingHash = await queryOne<DbBiometricCredential>(
        "SELECT * FROM biometric_credentials WHERE template_hash = ?",
        [templateHash],
      );
      if (existingHash) {
        res
          .status(409)
          .json({ error: "This fingerprint template is already enrolled." });
        return;
      }

      const credRecordId = `bio_${crypto.randomUUID().slice(0, 12)}`;
      const credentialId = `${provider}_${templateHash.slice(0, 24)}`;

      await execute(
        `INSERT INTO biometric_credentials (id, member_id, provider, credential_id, public_key, counter, transports, device_label, template_hash, created_at)
       VALUES (?, ?, ?, ?, '', 0, '[]', ?, ?, ?)`,
        [
          credRecordId,
          memberId,
          provider,
          credentialId,
          (deviceLabel || `${provider.toUpperCase()} USB Scanner`).slice(0, 80),
          templateHash,
          nowIso(),
        ],
      );

      res.status(201).json({
        enrolled: true,
        credentialRecordId: credRecordId,
        credentialId,
      });
    },
  );

  // Dedicated USB Scanner Local SDK Bridge Verification
  router.post(
    "/biometrics/sdk/verify",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      const { provider, templateData, matchedCredentialId, deviceLabel } =
        req.body as {
          provider?: BiometricProvider;
          templateData?: string;
          matchedCredentialId?: string;
          deviceLabel?: string;
        };

      if (!provider || (!templateData && !matchedCredentialId)) {
        res.status(400).json({
          error:
            "Hardware scanner templateData or matchedCredentialId is required",
        });
        return;
      }

      let matchedCred: DbBiometricCredential | null = null;
      if (matchedCredentialId) {
        matchedCred = await queryOne<DbBiometricCredential>(
          "SELECT * FROM biometric_credentials WHERE credential_id = ? AND provider = ?",
          [matchedCredentialId, provider],
        );
      } else if (templateData) {
        const templateHash = crypto
          .createHash("sha256")
          .update(templateData.trim())
          .digest("hex");
        matchedCred = await queryOne<DbBiometricCredential>(
          "SELECT * FROM biometric_credentials WHERE template_hash = ? AND provider = ?",
          [templateHash, provider],
        );
      }

      if (!matchedCred) {
        res.status(404).json({
          error:
            "No matching enrolled member fingerprint found for hardware capture.",
        });
        return;
      }

      const result = await recordAttendanceAndBuildResult(
        matchedCred.member_id,
        "hardware_sdk",
        (
          deviceLabel ||
          matchedCred.device_label ||
          `${provider.toUpperCase()} Scanner`
        ).slice(0, 80),
      );

      if (!result) {
        res.status(404).json({ error: "Member profile not found" });
        return;
      }

      res.json(result);
    },
  );
}
