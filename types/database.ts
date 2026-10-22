/**
 * Hand-written to match supabase/migrations/*.sql. This is a stand-in for the
 * file `supabase gen types typescript --linked > types/database.ts` would
 * produce — regenerate it for real once a Supabase project is linked, since
 * that command talks to a live project this environment doesn't have.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          bio: string | null;
          city: string | null;
          music_interests: string[];
          birthdate: string;
          role: 'user' | 'admin';
          is_verified: boolean;
          is_organizer_verified: boolean;
          onboarding_completed_at: string | null;
          notification_prefs: Json;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      event_categories: {
        Row: { id: string; slug: string; label: string; sort_order: number; is_active: boolean };
        Insert: Partial<Database['public']['Tables']['event_categories']['Row']>;
        Update: Partial<Database['public']['Tables']['event_categories']['Row']>;
      };
      events: {
        Row: {
          id: string;
          organizer_id: string;
          category_id: string;
          title: string;
          description: string;
          venue_type: string;
          city: string;
          neighborhood: string | null;
          lat: number;
          lng: number;
          starts_at: string;
          ends_at: string | null;
          min_age: number | null;
          rules: string | null;
          capacity: number | null;
          access_mode: 'open' | 'request' | 'invite_only';
          is_free: boolean;
          price_cents: number | null;
          request_deadline: string | null;
          status: 'draft' | 'pending_review' | 'published' | 'full' | 'cancelled' | 'finished';
          cover_image_url: string | null;
          organizer_confirmed_authorization: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: never; // creation only via the create_event_with_location RPC
        Update: Partial<Database['public']['Tables']['events']['Row']>;
      };
      event_images: {
        Row: { id: string; event_id: string; url: string; sort_order: number; created_at: string };
        Insert: Partial<Database['public']['Tables']['event_images']['Row']> & { event_id: string; url: string };
        Update: Partial<Database['public']['Tables']['event_images']['Row']>;
      };
      event_locations_private: {
        Row: {
          event_id: string;
          exact_address: string;
          exact_lat: number;
          exact_lng: number;
          access_notes: string | null;
          updated_at: string;
        };
        Insert: never;
        Update: Partial<Database['public']['Tables']['event_locations_private']['Row']>;
      };
      event_requests: {
        Row: {
          id: string;
          event_id: string;
          requester_id: string;
          status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'waitlisted';
          message: string | null;
          decided_by: string | null;
          decided_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
      };
      event_attendees: {
        Row: {
          id: string;
          event_id: string;
          profile_id: string;
          source: 'request' | 'invite';
          confirmed_at: string;
          cancelled_at: string | null;
        };
        Insert: never;
        Update: never;
      };
      conversations: {
        Row: { id: string; event_id: string | null; is_group: boolean; title: string | null; created_at: string };
        Insert: never;
        Update: never;
      };
      conversation_members: {
        Row: {
          conversation_id: string;
          profile_id: string;
          joined_at: string;
          last_read_at: string;
          is_admin: boolean;
          left_at: string | null;
        };
        Insert: never;
        Update: Partial<Pick<Database['public']['Tables']['conversation_members']['Row'], 'last_read_at' | 'left_at'>>;
      };
      messages: {
        Row: { id: string; conversation_id: string; sender_id: string; body: string; created_at: string };
        Insert: { conversation_id: string; sender_id: string; body: string };
        Update: never;
      };
      follows: {
        Row: { follower_id: string; followee_id: string; created_at: string };
        Insert: { follower_id: string; followee_id: string };
        Update: never;
      };
      saved_events: {
        Row: { profile_id: string; event_id: string; created_at: string };
        Insert: { profile_id: string; event_id: string };
        Update: never;
      };
      blocks: {
        Row: { blocker_id: string; blocked_id: string; created_at: string };
        Insert: { blocker_id: string; blocked_id: string };
        Update: never;
      };
      notifications: {
        Row: {
          id: string;
          profile_id: string;
          type: string;
          title: string;
          body: string;
          data: Json;
          is_read: boolean;
          created_at: string;
        };
        Insert: never;
        Update: Partial<Pick<Database['public']['Tables']['notifications']['Row'], 'is_read'>>;
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: 'event' | 'profile' | 'message';
          target_id: string;
          reason: string;
          details: string | null;
          status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          reporter_id: string;
          target_type: 'event' | 'profile' | 'message';
          target_id: string;
          reason: string;
          details?: string | null;
        };
        Update: Partial<Database['public']['Tables']['reports']['Row']>;
      };
      reviews: {
        Row: {
          id: string;
          event_id: string;
          reviewer_id: string;
          reviewee_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          event_id: string;
          reviewer_id: string;
          reviewee_id: string;
          rating: number;
          comment?: string | null;
        };
        Update: Partial<Pick<Database['public']['Tables']['reviews']['Row'], 'rating' | 'comment'>>;
      };
      device_tokens: {
        Row: { id: string; profile_id: string; expo_push_token: string; platform: 'ios' | 'android' | 'web'; created_at: string };
        Insert: { profile_id: string; expo_push_token: string; platform: 'ios' | 'android' | 'web' };
        Update: never;
      };
      admin_audit_logs: {
        Row: {
          id: string;
          admin_id: string;
          action: string;
          target_type: string;
          target_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: { admin_id: string; action: string; target_type: string; target_id?: string | null; metadata?: Json };
        Update: never;
      };
    };
    Functions: {
      events_within_radius: {
        Args: {
          origin_lat: number;
          origin_lng: number;
          radius_km?: number;
          category_slugs?: string[] | null;
          free_only?: boolean;
          order_by?: 'distance' | 'date' | 'popularity';
          page?: number;
          page_size?: number;
        };
        Returns: {
          id: string;
          title: string;
          cover_image_url: string | null;
          organizer_id: string;
          organizer_username: string;
          organizer_display_name: string;
          organizer_avatar_url: string | null;
          organizer_is_verified: boolean;
          category_slug: string;
          neighborhood: string | null;
          city: string | null;
          distance_m: number;
          starts_at: string;
          ends_at: string | null;
          price_cents: number | null;
          is_free: boolean;
          capacity: number | null;
          confirmed_count: number;
          status: string;
          access_mode: string;
          request_deadline: string | null;
          lat: number;
          lng: number;
        }[];
      };
      create_event_with_location: {
        Args: {
          p_category_slug: string;
          p_title: string;
          p_description: string;
          p_venue_type: string;
          p_city: string;
          p_neighborhood: string | null;
          p_exact_lat: number;
          p_exact_lng: number;
          p_exact_address: string;
          p_starts_at: string;
          p_ends_at: string | null;
          p_min_age: number | null;
          p_rules: string | null;
          p_capacity: number | null;
          p_access_mode: string;
          p_is_free: boolean;
          p_price_cents: number | null;
          p_request_deadline: string | null;
          p_cover_image_url: string | null;
          p_organizer_confirmed_authorization: boolean;
        };
        Returns: Database['public']['Tables']['events']['Row'];
      };
      request_event_access: {
        Args: { p_event_id: string; p_message?: string | null };
        Returns: Database['public']['Tables']['event_requests']['Row'];
      };
      accept_event_request: {
        Args: { p_request_id: string };
        Returns: Database['public']['Tables']['event_requests']['Row'];
      };
      reject_event_request: {
        Args: { p_request_id: string };
        Returns: Database['public']['Tables']['event_requests']['Row'];
      };
      invite_to_event: {
        Args: { p_event_id: string; p_profile_id: string };
        Returns: Database['public']['Tables']['event_requests']['Row'];
      };
      cancel_attendance: {
        Args: { p_event_id: string };
        Returns: void;
      };
      ensure_group_conversation: {
        Args: { p_event_id: string };
        Returns: string;
      };
    };
  };
}
