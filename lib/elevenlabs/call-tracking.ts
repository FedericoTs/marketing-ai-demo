/**
 * ElevenLabs Call Tracking API Client
 * Fetches conversation history from ElevenLabs Conversational AI API
 */

export interface ElevenLabsConversation {
  conversation_id: string;
  agent_id?: string;

  // Timing
  start_time_unix?: number;
  end_time_unix?: number;

  // Status
  call_successful?: 'success' | 'failure' | 'unknown';

  // Phone numbers
  phone_number?: string; // ElevenLabs number that received the call
  caller_phone?: string; // Caller's number

  // Metadata
  metadata?: Record<string, unknown>;

  // Raw data for debugging
  [key: string]: unknown;
}

export interface ConversationsListResponse {
  conversations: ElevenLabsConversation[];
  has_more: boolean;
  next_cursor?: string;
}

export interface FetchConversationsOptions {
  agentId?: string;
  callSuccessful?: 'success' | 'failure' | 'unknown';
  callStartAfterUnix?: number; // Fetch calls after this timestamp
  callStartBeforeUnix?: number; // Fetch calls before this timestamp
  pageSize?: number; // Max 100
  cursor?: string; // For pagination
}

/**
 * Fetches conversations from ElevenLabs API
 * @param apiKey ElevenLabs API key
 * @param options Filter and pagination options
 * @returns List of conversations with pagination info
 */
export async function fetchElevenLabsConversations(
  apiKey: string,
  options: FetchConversationsOptions = {}
): Promise<ConversationsListResponse> {
  const API_BASE_URL = 'https://api.elevenlabs.io/v1';

  // Build query parameters
  const queryParams = new URLSearchParams();

  if (options.cursor) {
    queryParams.append('cursor', options.cursor);
  }

  if (options.agentId) {
    queryParams.append('agent_id', options.agentId);
  }

  if (options.callSuccessful) {
    queryParams.append('call_successful', options.callSuccessful);
  }

  if (options.callStartAfterUnix) {
    queryParams.append('call_start_after_unix', options.callStartAfterUnix.toString());
  }

  if (options.callStartBeforeUnix) {
    queryParams.append('call_start_before_unix', options.callStartBeforeUnix.toString());
  }

  if (options.pageSize) {
    // Enforce max page size of 100
    const pageSize = Math.min(options.pageSize, 100);
    queryParams.append('page_size', pageSize.toString());
  }

  const url = `${API_BASE_URL}/convai/conversations${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

  console.log('[ElevenLabs API] Fetching conversations:', url);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `ElevenLabs API Error: ${response.status} - ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();

    console.log('[ElevenLabs API] Fetched conversations:', {
      count: data.conversations?.length || 0,
      hasMore: data.has_more || false,
    });

    return {
      conversations: data.conversations || [],
      has_more: data.has_more || false,
      next_cursor: data.next_cursor,
    };
  } catch (error) {
    console.error('[ElevenLabs API] Error fetching conversations:', error);
    throw error;
  }
}

/**
 * Fetches ALL conversations (handles pagination automatically)
 * WARNING: Can be slow for large datasets. Use with callStartAfterUnix filter.
 *
 * @param apiKey ElevenLabs API key
 * @param options Filter options (no cursor needed)
 * @param maxPages Maximum number of pages to fetch (default: 10, safety limit)
 * @returns All conversations matching the filter
 */
export async function fetchAllElevenLabsConversations(
  apiKey: string,
  options: Omit<FetchConversationsOptions, 'cursor'> = {},
  maxPages: number = 10
): Promise<ElevenLabsConversation[]> {
  const allConversations: ElevenLabsConversation[] = [];
  let cursor: string | undefined = undefined;
  let pageCount = 0;

  console.log('[ElevenLabs API] Fetching all conversations (max pages:', maxPages, ')');

  while (pageCount < maxPages) {
    const response = await fetchElevenLabsConversations(apiKey, {
      ...options,
      cursor,
    });

    allConversations.push(...response.conversations);
    pageCount++;

    if (!response.has_more || !response.next_cursor) {
      break;
    }

    cursor = response.next_cursor;
  }

  console.log('[ElevenLabs API] Fetched total conversations:', allConversations.length);

  return allConversations;
}

/**
 * Fetches conversations since a specific timestamp
 * Useful for syncing new calls
 *
 * @param apiKey ElevenLabs API key
 * @param sinceTimestamp Unix timestamp (seconds) - fetch calls after this time
 * @param agentId Optional agent ID filter
 * @returns List of new conversations
 */
export async function fetchNewElevenLabsConversations(
  apiKey: string,
  sinceTimestamp: number,
  agentId?: string
): Promise<ElevenLabsConversation[]> {
  console.log('[ElevenLabs API] Fetching new conversations since:', new Date(sinceTimestamp * 1000).toISOString());

  return fetchAllElevenLabsConversations(apiKey, {
    callStartAfterUnix: sinceTimestamp,
    agentId,
  });
}
