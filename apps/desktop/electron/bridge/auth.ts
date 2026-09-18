import crypto from "crypto";
import fs from "fs";
import path from "path";
import { createLogger } from "@jobpilot/shared";

const logger = createLogger("bridge-auth");

export interface BridgeAuthConfig {
  storagePath?: string;
  secret?: string;
  pairingCode?: string;
}

export class BridgeAuthManager {
  private secret: string;
  private pairingCode: string;
  private storagePath?: string;
  private failedPairingAttempts: number = 0;
  private lockoutUntil: number = 0;

  constructor(config: BridgeAuthConfig = {}) {
    this.storagePath = config.storagePath;
    this.secret = config.secret || "";
    this.pairingCode = config.pairingCode || "";

    if (this.storagePath && fs.existsSync(this.storagePath)) {
      try {
        const raw = fs.readFileSync(this.storagePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed.secret && typeof parsed.secret === "string") {
          this.secret = parsed.secret;
        }
        if (parsed.pairingCode && typeof parsed.pairingCode === "string") {
          this.pairingCode = parsed.pairingCode;
        }
      } catch (err) {
        logger.warn(`Failed to read stored bridge auth config: ${err}`);
      }
    }

    // Generate new credentials if not present
    if (!this.secret) {
      this.secret = crypto.randomBytes(32).toString("hex");
    }
    if (!this.pairingCode) {
      this.pairingCode = crypto.randomBytes(4).toString("hex").toUpperCase();
    }

    this.persist();
  }

  private persist(): void {
    if (!this.storagePath) return;

    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        this.storagePath,
        JSON.stringify(
          {
            secret: this.secret,
            pairingCode: this.pairingCode,
            createdAt: new Date().toISOString(),
          },
          null,
          2,
        ),
        { mode: 0o600 },
      );
    } catch (err) {
      logger.warn(`Failed to persist bridge auth config: ${err}`);
    }
  }

  public getSecret(): string {
    return this.secret;
  }

  public getPairingCode(): string {
    return this.pairingCode;
  }

  public isLockedOut(): boolean {
    return Date.now() < this.lockoutUntil;
  }

  public getLockoutSecondsRemaining(): number {
    return Math.max(0, Math.ceil((this.lockoutUntil - Date.now()) / 1000));
  }

  public rotatePairingCode(): string {
    this.pairingCode = crypto.randomBytes(4).toString("hex").toUpperCase();
    this.failedPairingAttempts = 0;
    this.lockoutUntil = 0;
    this.persist();
    return this.pairingCode;
  }

  public validateToken(token?: string | null): boolean {
    if (!token || typeof token !== "string") return false;
    const cleanToken = token.startsWith("Bearer ")
      ? token.slice(7).trim()
      : token.trim();
    if (!cleanToken) return false;

    // Constant-time comparison to prevent timing attacks
    if (cleanToken.length !== this.secret.length) return false;
    return crypto.timingSafeEqual(
      Buffer.from(cleanToken),
      Buffer.from(this.secret),
    );
  }

  public validatePairingCode(code?: string | null): boolean {
    if (this.isLockedOut()) {
      return false;
    }

    if (!code || typeof code !== "string") {
      this.recordFailedAttempt();
      return false;
    }
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      this.recordFailedAttempt();
      return false;
    }
    if (cleanCode.length !== this.pairingCode.length) {
      this.recordFailedAttempt();
      return false;
    }

    const isValid = crypto.timingSafeEqual(
      Buffer.from(cleanCode),
      Buffer.from(this.pairingCode),
    );

    if (!isValid) {
      this.recordFailedAttempt();
    }
    return isValid;
  }

  public validateAndConsumePairingCode(code?: string | null): boolean {
    const isValid = this.validatePairingCode(code);
    if (isValid) {
      // Single-use: immediately rotate code so it cannot be used again
      this.rotatePairingCode();
      return true;
    }
    return false;
  }

  private recordFailedAttempt(): void {
    this.failedPairingAttempts += 1;
    if (this.failedPairingAttempts >= 5) {
      this.lockoutUntil = Date.now() + 60 * 1000;
      logger.warn(
        "Bridge pairing locked out for 60s due to 5 consecutive failed attempts",
      );
    }
  }
}
