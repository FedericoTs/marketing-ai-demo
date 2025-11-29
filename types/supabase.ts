/**
 * Supabase Database Types
 *
 * This file provides type definitions for the Supabase client.
 * For production, generate types from your database schema using:
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
 */

/**
 * Minimal Database interface for Supabase client
 * This allows the client to work without full type generation
 */
export interface Database {
  public: {
    Tables: {
      [key: string]: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
    }
    Views: {
      [key: string]: {
        Row: Record<string, unknown>
      }
    }
    Functions: {
      [key: string]: {
        Args: Record<string, unknown>
        Returns: unknown
      }
    }
    Enums: {
      [key: string]: string
    }
  }
}
