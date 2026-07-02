/**
 * Evolution API (Baileys-based) multi-tenant WhatsApp integration layer.
 * 
 * Supports dynamically creating, managing, and interacting with WhatsApp instances
 * for virtual employees (multi-tenant setup).
 */

export interface EvolutionConfig {
  apiUrl: string;
  apiKey: string;
}

export interface CreateInstanceResponse {
  instance: {
    instanceName: string;
    instanceId: string;
    status: string;
  };
  hash: {
    apikey: string;
  };
  qrcode?: {
    code: string;
    base64: string;
  };
}

export interface ConnectionStateResponse {
  instance: {
    instanceName: string;
    state: "open" | "close" | "connecting";
  };
}

export class EvolutionAPI {
  private apiUrl: string;
  private apiKey: string;

  constructor(config?: Partial<EvolutionConfig>) {
    this.apiUrl = config?.apiUrl || process.env.EVOLUTION_API_URL || "http://localhost:8080";
    this.apiKey = config?.apiKey || process.env.EVOLUTION_API_TOKEN || "default_token";
    
    // Clean trailing slashes
    this.apiUrl = this.apiUrl.replace(/\/+$/, "");
  }

  private getHeaders(customHeaders?: Record<string, string>) {
    return {
      "Content-Type": "application/json",
      "apikey": this.apiKey,
      ...customHeaders,
    };
  }

  /**
   * Creates a new WhatsApp session instance for a tenant.
   */
  async createInstance(instanceName: string): Promise<CreateInstanceResponse> {
    const url = `${this.apiUrl}/instance/create`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          instanceName,
          token: `${instanceName}_token`, // Instance-specific API token for security
          qrcode: true,
          sendConnectionStatus: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create instance: ${response.statusText} (${response.status})`);
      }

      return await response.json() as CreateInstanceResponse;
    } catch (error) {
      console.error(`[EvolutionAPI] createInstance error for ${instanceName}:`, error);
      throw error;
    }
  }

  /**
   * Fetches connection status (e.g., connected, disconnected, scanning QR).
   */
  async getConnectionState(instanceName: string): Promise<ConnectionStateResponse> {
    const url = `${this.apiUrl}/instance/connectionState/${instanceName}`;
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get connection state: ${response.statusText}`);
      }

      return await response.json() as ConnectionStateResponse;
    } catch (error) {
      console.error(`[EvolutionAPI] getConnectionState error for ${instanceName}:`, error);
      throw error;
    }
  }

  /**
   * Fetches QR code to scan. Returns base64 representation and raw code.
   */
  async getQRCode(instanceName: string): Promise<{ code: string; base64: string } | null> {
    const url = `${this.apiUrl}/instance/connect/${instanceName}`;
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        // If already connected, connect endpoint may return an error or null
        return null;
      }

      const data = await response.json() as any;
      return {
        code: data.code || "",
        base64: data.base64 || data.qr || "",
      };
    } catch (error) {
      console.error(`[EvolutionAPI] getQRCode error for ${instanceName}:`, error);
      return null;
    }
  }

  /**
   * Logs out the WhatsApp instance from the device.
   */
  async logoutInstance(instanceName: string): Promise<boolean> {
    const url = `${this.apiUrl}/instance/logout/${instanceName}`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(),
      });

      return response.ok;
    } catch (error) {
      console.error(`[EvolutionAPI] logoutInstance error for ${instanceName}:`, error);
      return false;
    }
  }

  /**
   * Completely deletes the session/instance from the server.
   */
  async deleteInstance(instanceName: string): Promise<boolean> {
    const url = `${this.apiUrl}/instance/delete/${instanceName}`;
    try {
      const response = await fetch(url, {
        method: "DELETE",
        headers: this.getHeaders(),
      });

      return response.ok;
    } catch (error) {
      console.error(`[EvolutionAPI] deleteInstance error for ${instanceName}:`, error);
      return false;
    }
  }

  /**
   * Configures webhook to receive real-time notifications (messages, status).
   */
  async setWebhook(instanceName: string, webhookUrl: string): Promise<boolean> {
    const url = `${this.apiUrl}/webhook/set/${instanceName}`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          enabled: true,
          url: webhookUrl,
          byEvents: false,
          events: [
            "APPLICATION_STARTUP",
            "QRCODE_UPDATED",
            "MESSAGES_SET",
            "MESSAGES_UPSERT",
            "MESSAGES_UPDATE",
            "CONNECTION_UPDATE",
          ],
        }),
      });

      return response.ok;
    } catch (error) {
      console.error(`[EvolutionAPI] setWebhook error for ${instanceName}:`, error);
      return false;
    }
  }

  /**
   * Sends a plain text WhatsApp message to a specific number.
   */
  async sendTextMessage(instanceName: string, to: string, text: string): Promise<any> {
    const url = `${this.apiUrl}/message/sendText/${instanceName}`;
    // Format number: evolution API expects clean numbers without +, and ending with @s.whatsapp.net for direct or group
    // But direct sendText endpoint handles simple numbers e.g. "3912345678" or "3912345678@s.whatsapp.net" or formatting inside payload.
    const cleanNumber = to.replace(/[+\s-]/g, "");
    
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: this.getHeaders({
          "apikey": this.apiKey, // Webhooks or certain message routing can also utilize the instance's token
        }),
        body: JSON.stringify({
          number: cleanNumber,
          options: {
            delay: 1200, // Simulated typing delay in ms
            presence: "composing", // "composing" (typing...) presence state
          },
          textMessage: {
            text: text,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText} (${response.status})`);
      }

      return await response.json();
    } catch (error) {
      console.error(`[EvolutionAPI] sendTextMessage error for ${instanceName} to ${to}:`, error);
      throw error;
    }
  }
}
