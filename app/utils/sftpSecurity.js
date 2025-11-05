const crypto = require("crypto");
const config = require("../config/sftp.security");
const logger = require("./logger");

class SftpSecurity {
  constructor() {
    this.config = config.encryption;
  }

  async encryptCredentials(password) {
    try {
      const salt = crypto.randomBytes(this.config.saltLength);
      const key = await this.deriveKey(password, salt);
      const iv = crypto.randomBytes(this.config.ivLength);
      const cipher = crypto.createCipheriv(this.config.algorithm, key, iv);

      const encrypted = Buffer.concat([
        cipher.update(password, "utf8"),
        cipher.final(),
      ]);

      const tag = cipher.getAuthTag();

      return {
        encrypted: encrypted.toString("base64"),
        iv: iv.toString("base64"),
        salt: salt.toString("base64"),
        tag: tag.toString("base64"),
      };
    } catch (err) {
      logger.error("Encryption error:", err);
      throw new Error("Failed to encrypt credentials");
    }
  }

  async decryptCredentials(encryptedData) {
    try {
      const { encrypted, iv, salt, tag } = encryptedData;
      const key = await this.deriveKey(
        process.env.ENCRYPTION_KEY,
        Buffer.from(salt, "base64")
      );

      const decipher = crypto.createDecipheriv(
        this.config.algorithm,
        key,
        Buffer.from(iv, "base64")
      );

      decipher.setAuthTag(Buffer.from(tag, "base64"));

      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encrypted, "base64")),
        decipher.final(),
      ]);

      return decrypted.toString("utf8");
    } catch (err) {
      logger.error("Decryption error:", err);
      throw new Error("Failed to decrypt credentials");
    }
  }

  async deriveKey(password, salt) {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        password,
        salt,
        this.config.iterations,
        this.config.keyLength,
        this.config.digest,
        (err, key) => {
          if (err) reject(err);
          resolve(key);
        }
      );
    });
  }

  validateHostKey(hostKey, callback) {
    // Implement host key verification
    try {
      // Add your host key verification logic here
      const knownHosts = loadKnownHosts(); // Implement this function
      const isValid = verifyHostKey(hostKey, knownHosts); // Implement this function
      callback(null, isValid);
    } catch (err) {
      callback(err);
    }
  }
}

module.exports = new SftpSecurity();
