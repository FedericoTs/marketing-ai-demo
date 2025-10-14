export interface CallInitiateRequest {
  phoneNumber: string;
  callObjective: string;
  customerContext?: {
    name?: string;
    issue?: string;
    accountInfo?: string;
  };
  apiKey?: string;
  agentId?: string;
  phoneNumberId?: string;
}

export interface CallInitiateResponse {
  success: boolean;
  callId?: string;
  status?: string;
  message?: string;
  error?: string;
}

export interface CallStatusResponse {
  success: boolean;
  callId?: string;
  status?: string;
  duration?: number;
  transcript?: string;
  error?: string;
}
