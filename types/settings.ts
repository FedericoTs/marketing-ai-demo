export interface ElevenLabsAgent {
  id: string;
  name: string;
  description: string;
  agentId: string;
}

export interface CompanySettings {
  companyName: string;
  industry: string;
  brandVoice: string;
  tone?: string;
  targetAudience: string;
  openaiApiKey: string;
  elevenlabsApiKey: string;
  elevenlabsAgentId?: string;
  elevenlabsPhoneNumberId?: string;
  elevenlabsAgents?: ElevenLabsAgent[];
  phoneNumber?: string;
}

export const defaultSettings: CompanySettings = {
  companyName: "Miracle-Ear",
  industry: "Hearing Healthcare & Medical Devices",
  brandVoice: "Compassionate, trustworthy, empowering, and relationship-focused. We humanize hearing solutions by addressing emotional needs and removing stigma. Our tone is warm, supportive, and celebrates life's precious moments of connection.",
  targetAudience: "Adults 55+ experiencing hearing loss, their concerned family members (often adult children), and first-time hearing aid users who may feel anxious about the stigma. They value discretion, comfort, and maintaining their independence and social connections.",
  openaiApiKey: "",
  elevenlabsApiKey: "",
  elevenlabsAgentId: "",
  elevenlabsPhoneNumberId: "",
  elevenlabsAgents: [],
};
