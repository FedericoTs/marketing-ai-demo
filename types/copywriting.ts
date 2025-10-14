export interface CopyVariation {
  id: string;
  content: string;
  platform: string;
  audience: string;
  tone?: string;
}

export interface CopywritingRequest {
  prompt: string;
  companyContext: {
    companyName: string;
    industry: string;
    brandVoice: string;
    targetAudience: string;
  };
}

export interface CopywritingResponse {
  variations: CopyVariation[];
  success: boolean;
  error?: string;
}
