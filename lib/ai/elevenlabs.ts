// ElevenLabs Conversational AI Client
// Real implementation using ElevenLabs API

export interface CallOptions {
  phoneNumber: string;
  agentId: string;
  agentPhoneNumberId: string; // The ID of your configured phone number in ElevenLabs
  firstMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface ConversationalAIClient {
  initiateCall(options: CallOptions): Promise<{
    callId: string;
    status: string;
  }>;
  getCallStatus(callId: string): Promise<{
    callId: string;
    status: string;
    duration?: number;
    transcript?: string;
  }>;
}

/**
 * Creates an ElevenLabs Conversational AI client
 * Uses the real ElevenLabs API
 */
export function createElevenLabsClient(
  apiKey: string
): ConversationalAIClient {
  const API_BASE_URL = "https://api.elevenlabs.io/v1";

  return {
    async initiateCall(options: CallOptions) {
      console.log("ElevenLabs Call Initiation - Real API:", {
        phoneNumber: options.phoneNumber,
        agentId: options.agentId,
      });

      try {
        // Build request body with all optional fields
        const requestBody: Record<string, unknown> = {
          agent_id: options.agentId,
          agent_phone_number_id: options.agentPhoneNumberId,
          to_number: options.phoneNumber,
        };

        // Add conversation initiation data if firstMessage is provided
        if (options.firstMessage) {
          requestBody.conversation_initiation_client_data = {
            first_message: options.firstMessage,
          };
        }

        // Add custom variables if metadata is provided
        if (options.metadata) {
          requestBody.conversation_initiation_client_data = {
            ...requestBody.conversation_initiation_client_data as Record<string, unknown>,
            custom_llm_extra_body: {
              variables: options.metadata,
            },
          };
        }

        console.log("ElevenLabs API Request Body:", JSON.stringify(requestBody, null, 2));

        // Call ElevenLabs Twilio outbound call API
        const response = await fetch(`${API_BASE_URL}/convai/twilio/outbound-call`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": apiKey,
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            `ElevenLabs API Error: ${response.status} - ${JSON.stringify(errorData)}`
          );
        }

        const data = await response.json();
        console.log("ElevenLabs API Response:", data);

        return {
          callId: data.call_id || data.id || `call_${Date.now()}`,
          status: data.status || "initiated",
        };
      } catch (error) {
        console.error("Error calling ElevenLabs API:", error);
        throw error;
      }
    },

    async getCallStatus(callId: string) {
      console.log("ElevenLabs Call Status Check:", callId);

      // ElevenLabs doesn't have a specific call status endpoint in the docs
      // For now, return a placeholder response
      // In production, you might use webhooks or polling
      return {
        callId,
        status: "completed",
        duration: 0,
        transcript: "Call status tracking via webhooks recommended",
      };
    },
  };
}

/**
 * Validates phone number format
 */
export function validatePhoneNumber(phoneNumber: string): {
  valid: boolean;
  error?: string;
} {
  // Remove all non-numeric characters except +
  const cleaned = phoneNumber.replace(/[^\d+]/g, "");

  // Basic validation for international format
  if (!cleaned.startsWith("+")) {
    return {
      valid: false,
      error: "Phone number must start with + (international format)",
    };
  }

  if (cleaned.length < 10 || cleaned.length > 15) {
    return {
      valid: false,
      error: "Phone number must be between 10 and 15 digits",
    };
  }

  return { valid: true };
}

/**
 * Builds a personalized first message for the agent
 * This is what the agent will say when the call connects
 */
export function buildAgentPrompt(
  objective: string,
  customerContext: Record<string, unknown>,
  companyInfo: Record<string, unknown>
): string {
  const customerName = customerContext?.name ? String(customerContext.name) : "";
  const companyName = String(companyInfo.companyName || "our company");

  // Build a natural opening message
  let greeting = `Hello`;

  if (customerName) {
    greeting += `, ${customerName}`;
  }

  greeting += `! This is a call from ${companyName}.`;

  // Add the objective/reason for call
  if (objective) {
    greeting += ` ${objective}`;
  }

  return greeting;
}

/**
 * Builds metadata object with customer context and call information
 * This gets passed to the agent as variables that can be referenced
 */
export function buildAgentMetadata(
  objective: string,
  customerContext: Record<string, unknown>,
  companyInfo: Record<string, unknown>
): Record<string, unknown> {
  return {
    call_objective: objective,
    customer_name: customerContext?.name || "",
    customer_issue: customerContext?.issue || "",
    customer_account: customerContext?.accountInfo || "",
    company_name: companyInfo.companyName || "",
    brand_voice: companyInfo.brandVoice || "",
  };
}
