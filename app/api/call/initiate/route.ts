import { NextRequest, NextResponse } from "next/server";
import {
  createElevenLabsClient,
  validatePhoneNumber,
  buildAgentPrompt,
  buildAgentMetadata,
} from "@/lib/ai/elevenlabs";
import { CallInitiateRequest, CallInitiateResponse } from "@/types/call";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

export async function POST(request: NextRequest) {
  try {
    const body: CallInitiateRequest = await request.json();
    const { phoneNumber, callObjective, customerContext } = body;

    console.log("=== Call Initiate API - Request Received ===");
    console.log("Body received:", {
      phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 5)}...` : "MISSING",
      callObjective: callObjective ? "Present" : "MISSING",
      hasCustomerContext: !!customerContext,
      apiKey: body.apiKey ? `${body.apiKey.substring(0, 10)}...` : "MISSING",
      agentId: body.agentId || "MISSING",
      phoneNumberId: body.phoneNumberId || "MISSING",
    });

    if (!phoneNumber || !callObjective) {
      return NextResponse.json(
        errorResponse("Missing required fields", "MISSING_FIELDS"),
        { status: 400 }
      );
    }

    // Validate phone number
    const validation = validatePhoneNumber(phoneNumber);
    if (!validation.valid) {
      return NextResponse.json(
        errorResponse(validation.error || "Invalid phone number", "INVALID_PHONE_NUMBER"),
        { status: 400 }
      );
    }

    // Get API key, Agent ID, and Phone Number ID from request body (passed from frontend settings)
    const apiKey = body.apiKey || process.env.ELEVENLABS_API_KEY;
    const agentId = body.agentId || process.env.ELEVENLABS_AGENT_ID;
    const phoneNumberId = body.phoneNumberId || process.env.ELEVENLABS_PHONE_NUMBER_ID;

    console.log("=== Resolved Configuration ===");
    console.log({
      apiKey: apiKey ? "Present" : "MISSING",
      agentId: agentId || "MISSING",
      phoneNumberId: phoneNumberId || "MISSING",
      source: {
        apiKey: body.apiKey ? "body" : "env",
        agentId: body.agentId ? "body" : "env",
        phoneNumberId: body.phoneNumberId ? "body" : "env",
      }
    });

    // ⚠️ DEMO MODE PATTERN: Return 200 with error for missing API key
    // This allows frontend to show demo message instead of error state
    if (!apiKey) {
      return NextResponse.json(
        errorResponse(
          "ElevenLabs API key not configured. Please add it in Settings. Demo Mode: Call would be initiated if API key was configured.",
          "API_KEY_MISSING"
        ),
        { status: 200 } // Intentional 200 for demo mode
      );
    }

    if (!agentId) {
      return NextResponse.json(
        errorResponse(
          "ElevenLabs Agent ID not configured. Please add it in Settings.",
          "AGENT_ID_MISSING"
        ),
        { status: 400 }
      );
    }

    if (!phoneNumberId) {
      return NextResponse.json(
        errorResponse(
          "ElevenLabs Phone Number ID not configured. Please add it in Settings. This is the ID of your configured phone number in ElevenLabs.",
          "PHONE_NUMBER_ID_MISSING"
        ),
        { status: 400 }
      );
    }

    // Create ElevenLabs client
    const client = createElevenLabsClient(apiKey);

    // Build company info object
    const companyInfo = {
      companyName: "Miracle-Ear",
      brandVoice: "Compassionate and supportive",
    };

    // Build personalized first message
    const firstMessage = buildAgentPrompt(
      callObjective,
      customerContext || {},
      companyInfo
    );

    // Build metadata with all context for the agent
    const metadata = buildAgentMetadata(
      callObjective,
      customerContext || {},
      companyInfo
    );

    console.log("=== Agent Configuration ===");
    console.log("First Message:", firstMessage);
    console.log("Metadata:", metadata);

    // Initiate call
    const result = await client.initiateCall({
      phoneNumber,
      agentId,
      agentPhoneNumberId: phoneNumberId,
      firstMessage,
      metadata,
    });

    return NextResponse.json(
      successResponse(
        {
          callId: result.callId,
          status: result.status,
        },
        "Call initiated successfully (Demo Mode)"
      )
    );
  } catch (error: unknown) {
    console.error("Error initiating call:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      errorResponse(
        `Failed to initiate call: ${errorMessage}`,
        "CALL_INITIATE_ERROR"
      ),
      { status: 500 }
    );
  }
}
