export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      allowed_emails: {
        Row: {
          added_by: string | null
          created_at: string | null
          email: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }
        Insert: {
          added_by?: string | null
          created_at?: string | null
          email: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Update: {
          added_by?: string | null
          created_at?: string | null
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          company_name: string | null
          complete_address: string | null
          created_at: string | null
          customer_code: string
          customer_name: string
          email: string | null
          gst_number: string | null
          id: string
          mobile_number: string | null
          updated_at: string | null
        }
        Insert: {
          company_name?: string | null
          complete_address?: string | null
          created_at?: string | null
          customer_code: string
          customer_name: string
          email?: string | null
          gst_number?: string | null
          id?: string
          mobile_number?: string | null
          updated_at?: string | null
        }
        Update: {
          company_name?: string | null
          complete_address?: string | null
          created_at?: string | null
          customer_code?: string
          customer_name?: string
          email?: string | null
          gst_number?: string | null
          id?: string
          mobile_number?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          error_message: string | null
          id: string
          quotation_id: string | null
          recipient_email: string | null
          sent_at: string
          sent_by: string | null
          status: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          quotation_id?: string | null
          recipient_email?: string | null
          sent_at?: string
          sent_by?: string | null
          status?: string
        }
        Update: {
          error_message?: string | null
          id?: string
          quotation_id?: string | null
          recipient_email?: string | null
          sent_at?: string
          sent_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          all_channels: string | null
          camera_quality: string | null
          category: string | null
          checked_by: string | null
          created_at: string | null
          customer_city: string | null
          customer_code: string | null
          customer_name: string | null
          dispatch_date: string | null
          gps_test: string | null
          id: string
          in_date: string | null
          ip_address: string | null
          monitor_test: string | null
          network_test: string | null
          online_test: string | null
          order_id: string | null
          product_name: string
          qc_date: string | null
          qc_result: string | null
          sd_connect: string | null
          serial_number: string
          sim_slot: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          all_channels?: string | null
          camera_quality?: string | null
          category?: string | null
          checked_by?: string | null
          created_at?: string | null
          customer_city?: string | null
          customer_code?: string | null
          customer_name?: string | null
          dispatch_date?: string | null
          gps_test?: string | null
          id?: string
          in_date?: string | null
          ip_address?: string | null
          monitor_test?: string | null
          network_test?: string | null
          online_test?: string | null
          order_id?: string | null
          product_name: string
          qc_date?: string | null
          qc_result?: string | null
          sd_connect?: string | null
          serial_number: string
          sim_slot?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          all_channels?: string | null
          camera_quality?: string | null
          category?: string | null
          checked_by?: string | null
          created_at?: string | null
          customer_city?: string | null
          customer_code?: string | null
          customer_name?: string | null
          dispatch_date?: string | null
          gps_test?: string | null
          id?: string
          in_date?: string | null
          ip_address?: string | null
          monitor_test?: string | null
          network_test?: string | null
          online_test?: string | null
          order_id?: string | null
          product_name?: string
          qc_date?: string | null
          qc_result?: string | null
          sd_connect?: string | null
          serial_number?: string
          sim_slot?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          alternate_mobile: string | null
          company_name: string | null
          complete_address: string | null
          created_at: string | null
          customer_code: string
          customer_name: string
          email: string | null
          gst_number: string | null
          id: string
          location: string | null
          mobile_number: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          alternate_mobile?: string | null
          company_name?: string | null
          complete_address?: string | null
          created_at?: string | null
          customer_code: string
          customer_name: string
          email?: string | null
          gst_number?: string | null
          id?: string
          location?: string | null
          mobile_number: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          alternate_mobile?: string | null
          company_name?: string | null
          complete_address?: string | null
          created_at?: string | null
          customer_code?: string
          customer_name?: string
          email?: string | null
          gst_number?: string | null
          id?: string
          location?: string | null
          mobile_number?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      otp_verifications: {
        Row: {
          attempts: number | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          otp_code: string
          used: boolean | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          otp_code: string
          used?: boolean | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          otp_code?: string
          used?: boolean | null
        }
        Relationships: []
      }
      payment_history: {
        Row: {
          account_received: string
          amount: number
          created_at: string | null
          id: string
          order_id: string
          payment_date: string
          payment_reference: string | null
        }
        Insert: {
          account_received: string
          amount: number
          created_at?: string | null
          id?: string
          order_id: string
          payment_date: string
          payment_reference?: string | null
        }
        Update: {
          account_received?: string
          amount?: number
          created_at?: string | null
          id?: string
          order_id?: string
          payment_date?: string
          payment_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["order_id"]
          },
        ]
      }
      product_pricing: {
        Row: {
          created_at: string | null
          id: string
          product_code: string
          qty_0_10: number | null
          qty_10_50: number | null
          qty_100_plus: number | null
          qty_50_100: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_code: string
          qty_0_10?: number | null
          qty_10_50?: number | null
          qty_100_plus?: number | null
          qty_50_100?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          product_code?: string
          qty_0_10?: number | null
          qty_10_50?: number | null
          qty_100_plus?: number | null
          qty_50_100?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_pricing_product_code_fkey"
            columns: ["product_code"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_code"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string | null
          id: string
          product_code: string
          product_name: string
          updated_at: string | null
          weight_kg: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          product_code: string
          product_name: string
          updated_at?: string | null
          weight_kg?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          product_code?: string
          product_name?: string
          updated_at?: string | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      quotation_items: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          hsn_sac: string | null
          id: string
          product_code: string
          product_name: string
          quantity: number
          quotation_id: string
          unit: string | null
          unit_price: number
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          hsn_sac?: string | null
          id?: string
          product_code: string
          product_name: string
          quantity?: number
          quotation_id: string
          unit?: string | null
          unit_price?: number
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          hsn_sac?: string | null
          id?: string
          product_code?: string
          product_name?: string
          quantity?: number
          quotation_id?: string
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          address: string | null
          apply_courier_gst: boolean
          apply_gst: boolean
          approved_at: string | null
          approved_by: string | null
          company_name: string | null
          converted_order_id: string | null
          courier_charge: number
          courier_gst_amount: number
          courier_type: string | null
          created_at: string
          created_by: string | null
          created_role: string | null
          customer_code: string | null
          customer_id: string | null
          customer_name: string
          grand_total: number
          gst_amount: number
          gst_number: string | null
          id: string
          mobile: string | null
          quotation_date: string
          quotation_no: string
          rejected_reason: string | null
          status: string
          subtotal: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          apply_courier_gst?: boolean
          apply_gst?: boolean
          approved_at?: string | null
          approved_by?: string | null
          company_name?: string | null
          converted_order_id?: string | null
          courier_charge?: number
          courier_gst_amount?: number
          courier_type?: string | null
          created_at?: string
          created_by?: string | null
          created_role?: string | null
          customer_code?: string | null
          customer_id?: string | null
          customer_name: string
          grand_total?: number
          gst_amount?: number
          gst_number?: string | null
          id?: string
          mobile?: string | null
          quotation_date?: string
          quotation_no: string
          rejected_reason?: string | null
          status?: string
          subtotal?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          apply_courier_gst?: boolean
          apply_gst?: boolean
          approved_at?: string | null
          approved_by?: string | null
          company_name?: string | null
          converted_order_id?: string | null
          courier_charge?: number
          courier_gst_amount?: number
          courier_type?: string | null
          created_at?: string
          created_by?: string | null
          created_role?: string | null
          customer_code?: string | null
          customer_id?: string | null
          customer_name?: string
          grand_total?: number
          gst_amount?: number
          gst_number?: string | null
          id?: string
          mobile?: string | null
          quotation_date?: string
          quotation_no?: string
          rejected_reason?: string | null
          status?: string
          subtotal?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      renewals: {
        Row: {
          company_name: string | null
          created_at: string
          customer_code: string | null
          customer_name: string | null
          dispatch_date: string
          id: string
          order_id: string
          product_name: string | null
          product_type: string
          renewal_end_date: string
          renewal_start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          customer_code?: string | null
          customer_name?: string | null
          dispatch_date: string
          id?: string
          order_id: string
          product_name?: string | null
          product_type: string
          renewal_end_date: string
          renewal_start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          customer_code?: string | null
          customer_name?: string | null
          dispatch_date?: string
          id?: string
          order_id?: string
          product_name?: string | null
          product_type?: string
          renewal_end_date?: string
          renewal_start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      sale_edit_logs: {
        Row: {
          created_at: string
          edit_type: string
          edited_by: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          order_id: string
        }
        Insert: {
          created_at?: string
          edit_type?: string
          edited_by?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          order_id: string
        }
        Update: {
          created_at?: string
          edit_type?: string
          edited_by?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          order_id?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_name: string
          quantity: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_name?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["order_id"]
          },
        ]
      }
      sales: {
        Row: {
          account_received: string | null
          amount_received: number | null
          balance_amount: number | null
          company_name: string | null
          courier_cost: number | null
          created_at: string | null
          customer_code: string
          customer_contact: string | null
          customer_id: string | null
          customer_name: string | null
          employee_name: string
          gst_amount: number | null
          id: string
          order_id: string
          payment_reference: string | null
          remarks: string | null
          sale_date: string
          sale_type: string
          subtotal: number
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          account_received?: string | null
          amount_received?: number | null
          balance_amount?: number | null
          company_name?: string | null
          courier_cost?: number | null
          created_at?: string | null
          customer_code: string
          customer_contact?: string | null
          customer_id?: string | null
          customer_name?: string | null
          employee_name: string
          gst_amount?: number | null
          id?: string
          order_id: string
          payment_reference?: string | null
          remarks?: string | null
          sale_date: string
          sale_type: string
          subtotal: number
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          account_received?: string | null
          amount_received?: number | null
          balance_amount?: number | null
          company_name?: string | null
          courier_cost?: number | null
          created_at?: string | null
          customer_code?: string
          customer_contact?: string | null
          customer_id?: string | null
          customer_name?: string | null
          employee_name?: string
          gst_amount?: number | null
          id?: string
          order_id?: string
          payment_reference?: string | null
          remarks?: string | null
          sale_date?: string
          sale_type?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          courier_partner: string | null
          created_at: string | null
          id: string
          order_id: string | null
          shipment_type: string
          shipping_cost: number | null
          shipping_mode: string | null
          tracking_id: string | null
          weight_kg: number | null
        }
        Insert: {
          courier_partner?: string | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          shipment_type?: string
          shipping_cost?: number | null
          shipping_mode?: string | null
          tracking_id?: string | null
          weight_kg?: number | null
        }
        Update: {
          courier_partner?: string | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          shipment_type?: string
          shipping_cost?: number | null
          shipping_mode?: string | null
          tracking_id?: string | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      tickets: {
        Row: {
          assigned_to: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          customer_code: string
          description: string | null
          id: string
          issue_type: string
          priority: string
          status: string
          ticket_no: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_code: string
          description?: string | null
          id?: string
          issue_type: string
          priority?: string
          status?: string
          ticket_no: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_code?: string
          description?: string | null
          id?: string
          issue_type?: string
          priority?: string
          status?: string
          ticket_no?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          compact_view: boolean
          created_at: string
          dark_mode: boolean
          email_notifications: boolean
          id: string
          lead_alerts: boolean
          payment_alerts: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          compact_view?: boolean
          created_at?: string
          dark_mode?: boolean
          email_notifications?: boolean
          id?: string
          lead_alerts?: boolean
          payment_alerts?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          compact_view?: boolean
          created_at?: string
          dark_mode?: boolean
          email_notifications?: boolean
          id?: string
          lead_alerts?: boolean
          payment_alerts?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_otps: { Args: never; Returns: undefined }
      ensure_user_settings: { Args: never; Returns: string }
      generate_order_id: { Args: never; Returns: string }
      generate_quotation_no: { Args: never; Returns: string }
      generate_ticket_no: { Args: never; Returns: string }
      get_email_role: {
        Args: { _email: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_email_allowed: { Args: { _email: string }; Returns: boolean }
      is_master_admin: { Args: { _user_id: string }; Returns: boolean }
      is_master_admin_email: { Args: { _email: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "master_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "master_admin"],
    },
  },
} as const
