
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "activities": {
                  Row: {
                    "actor_id": string | null,"appointment_id": string | null,"body": string | null,"created_at": string,"customer_id": string | null,"id": string,"metadata": NonNullable<Json>,"opportunity_id": string | null,"organization_id": string,"task_id": string | null,"type": Database["public"]['Enums']["activity_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"appointment_id"?: string | null,"body"?: string | null,"created_at"?: string,"customer_id"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"opportunity_id"?: string | null,"organization_id": string,"task_id"?: string | null,"type": Database["public"]['Enums']["activity_type"]
                  }
                  Update: {
                    "actor_id"?: string | null,"appointment_id"?: string | null,"body"?: string | null,"created_at"?: string,"customer_id"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"opportunity_id"?: string | null,"organization_id"?: string,"task_id"?: string | null,"type"?: Database["public"]['Enums']["activity_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "activities_appointment_fk"
      columns: ["organization_id","appointment_id"]
isOneToOne: false
      referencedRelation: "appointments"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "activities_organization_id_customer_id_fkey"
      columns: ["organization_id","customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "activities_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activities_organization_id_opportunity_id_fkey"
      columns: ["organization_id","opportunity_id"]
isOneToOne: false
      referencedRelation: "opportunities"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "activities_organization_id_task_id_fkey"
      columns: ["organization_id","task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"ai_conversations": {
                  Row: {
                    "created_at": string,"id": string,"organization_id": string,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"organization_id": string,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"organization_id"?: string,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_conversations_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"ai_messages": {
                  Row: {
                    "content": string,"conversation_id": string,"created_at": string,"id": string,"metadata": NonNullable<Json>,"organization_id": string,"role": Database["public"]['Enums']["ai_message_role"]
                  }
                  ComputedFields: never
                  Insert: {
                    "content": string,"conversation_id": string,"created_at"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"organization_id": string,"role": Database["public"]['Enums']["ai_message_role"]
                  }
                  Update: {
                    "content"?: string,"conversation_id"?: string,"created_at"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"organization_id"?: string,"role"?: Database["public"]['Enums']["ai_message_role"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_messages_organization_id_conversation_id_fkey"
      columns: ["organization_id","conversation_id"]
isOneToOne: false
      referencedRelation: "ai_conversations"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"appointments": {
                  Row: {
                    "cancellation_reason": string | null,"cancelled_at": string | null,"created_at": string,"created_by": string | null,"customer_id": string,"ends_at": string,"id": string,"idempotency_key": string | null,"notes": string | null,"organization_id": string,"price": number | null,"professional_id": string,"service_id": string,"source": string,"starts_at": string,"status": Database["public"]['Enums']["appointment_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cancellation_reason"?: string | null,"cancelled_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"customer_id": string,"ends_at": string,"id"?: string,"idempotency_key"?: string | null,"notes"?: string | null,"organization_id": string,"price"?: number | null,"professional_id": string,"service_id": string,"source"?: string,"starts_at": string,"status"?: Database["public"]['Enums']["appointment_status"],"updated_at"?: string
                  }
                  Update: {
                    "cancellation_reason"?: string | null,"cancelled_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"customer_id"?: string,"ends_at"?: string,"id"?: string,"idempotency_key"?: string | null,"notes"?: string | null,"organization_id"?: string,"price"?: number | null,"professional_id"?: string,"service_id"?: string,"source"?: string,"starts_at"?: string,"status"?: Database["public"]['Enums']["appointment_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "appointments_organization_id_customer_id_fkey"
      columns: ["organization_id","customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "appointments_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "appointments_organization_id_professional_id_fkey"
      columns: ["organization_id","professional_id"]
isOneToOne: false
      referencedRelation: "professionals"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "appointments_organization_id_service_id_fkey"
      columns: ["organization_id","service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"audit_logs": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"entity_id": string | null,"entity_type": string | null,"id": number,"metadata": NonNullable<Json>,"organization_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"entity_id"?: string | null,"entity_type"?: string | null,"id"?: never,"metadata"?: NonNullable<Json>,"organization_id": string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"entity_id"?: string | null,"entity_type"?: string | null,"id"?: never,"metadata"?: NonNullable<Json>,"organization_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_logs_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"customers": {
                  Row: {
                    "archived_at": string | null,"company_name": string | null,"created_at": string,"created_by": string | null,"email": string | null,"full_name": string,"id": string,"notes": string | null,"organization_id": string,"phone": string | null,"source": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"company_name"?: string | null,"created_at"?: string,"created_by"?: string | null,"email"?: string | null,"full_name": string,"id"?: string,"notes"?: string | null,"organization_id": string,"phone"?: string | null,"source"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "archived_at"?: string | null,"company_name"?: string | null,"created_at"?: string,"created_by"?: string | null,"email"?: string | null,"full_name"?: string,"id"?: string,"notes"?: string | null,"organization_id"?: string,"phone"?: string | null,"source"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "customers_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"opportunities": {
                  Row: {
                    "closed_at": string | null,"created_at": string,"created_by": string | null,"customer_id": string,"estimated_value": number | null,"follow_up_on": string | null,"id": string,"last_interaction_at": string,"next_action": string | null,"notes": string | null,"organization_id": string,"owner_id": string | null,"priority": Database["public"]['Enums']["priority_level"],"stage": Database["public"]['Enums']["opportunity_stage"],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "closed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"customer_id": string,"estimated_value"?: number | null,"follow_up_on"?: string | null,"id"?: string,"last_interaction_at"?: string,"next_action"?: string | null,"notes"?: string | null,"organization_id": string,"owner_id"?: string | null,"priority"?: Database["public"]['Enums']["priority_level"],"stage"?: Database["public"]['Enums']["opportunity_stage"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "closed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"customer_id"?: string,"estimated_value"?: number | null,"follow_up_on"?: string | null,"id"?: string,"last_interaction_at"?: string,"next_action"?: string | null,"notes"?: string | null,"organization_id"?: string,"owner_id"?: string | null,"priority"?: Database["public"]['Enums']["priority_level"],"stage"?: Database["public"]['Enums']["opportunity_stage"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "opportunities_organization_id_customer_id_fkey"
      columns: ["organization_id","customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "opportunities_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"organization_members": {
                  Row: {
                    "created_at": string,"organization_id": string,"role": Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"organization_id": string,"role"?: Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"organization_id"?: string,"role"?: Database["public"]['Enums']["member_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "organization_members_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"organizations": {
                  Row: {
                    "booking_enabled": boolean,"booking_max_days_ahead": number,"booking_min_notice_minutes": number,"booking_slot_interval_minutes": number,"country": string,"created_at": string,"currency": string,"followup_stale_days": number,"id": string,"locale": string,"modules": (string)[],"name": string,"plan": string,"segment": string,"slug": string,"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "booking_enabled"?: boolean,"booking_max_days_ahead"?: number,"booking_min_notice_minutes"?: number,"booking_slot_interval_minutes"?: number,"country"?: string,"created_at"?: string,"currency"?: string,"followup_stale_days"?: number,"id"?: string,"locale"?: string,"modules"?: (string)[],"name": string,"plan"?: string,"segment"?: string,"slug": string,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "booking_enabled"?: boolean,"booking_max_days_ahead"?: number,"booking_min_notice_minutes"?: number,"booking_slot_interval_minutes"?: number,"country"?: string,"created_at"?: string,"currency"?: string,"followup_stale_days"?: number,"id"?: string,"locale"?: string,"modules"?: (string)[],"name"?: string,"plan"?: string,"segment"?: string,"slug"?: string,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"professional_services": {
                  Row: {
                    "organization_id": string,"professional_id": string,"service_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "organization_id": string,"professional_id": string,"service_id": string
                  }
                  Update: {
                    "organization_id"?: string,"professional_id"?: string,"service_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "professional_services_organization_id_professional_id_fkey"
      columns: ["organization_id","professional_id"]
isOneToOne: false
      referencedRelation: "professionals"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "professional_services_organization_id_service_id_fkey"
      columns: ["organization_id","service_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"professionals": {
                  Row: {
                    "active": boolean,"created_at": string,"email": string | null,"id": string,"name": string,"organization_id": string,"phone": string | null,"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"email"?: string | null,"id"?: string,"name": string,"organization_id": string,"phone"?: string | null,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"email"?: string | null,"id"?: string,"name"?: string,"organization_id"?: string,"phone"?: string | null,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "professionals_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"current_organization_id": string | null,"full_name": string | null,"id": string,"locale": string | null,"preferences": NonNullable<Json>,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"current_organization_id"?: string | null,"full_name"?: string | null,"id": string,"locale"?: string | null,"preferences"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"current_organization_id"?: string | null,"full_name"?: string | null,"id"?: string,"locale"?: string | null,"preferences"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_current_organization_id_fkey"
      columns: ["current_organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"services": {
                  Row: {
                    "active": boolean,"created_at": string,"description": string | null,"duration_minutes": number,"id": string,"name": string,"organization_id": string,"price": number | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"description"?: string | null,"duration_minutes": number,"id"?: string,"name": string,"organization_id": string,"price"?: number | null,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"description"?: string | null,"duration_minutes"?: number,"id"?: string,"name"?: string,"organization_id"?: string,"price"?: number | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "services_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"tasks": {
                  Row: {
                    "assignee_id": string | null,"completed_at": string | null,"created_at": string,"created_by": string | null,"customer_id": string | null,"description": string | null,"due_at": string | null,"id": string,"opportunity_id": string | null,"organization_id": string,"priority": Database["public"]['Enums']["priority_level"],"status": Database["public"]['Enums']["task_status"],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assignee_id"?: string | null,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"customer_id"?: string | null,"description"?: string | null,"due_at"?: string | null,"id"?: string,"opportunity_id"?: string | null,"organization_id": string,"priority"?: Database["public"]['Enums']["priority_level"],"status"?: Database["public"]['Enums']["task_status"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "assignee_id"?: string | null,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"customer_id"?: string | null,"description"?: string | null,"due_at"?: string | null,"id"?: string,"opportunity_id"?: string | null,"organization_id"?: string,"priority"?: Database["public"]['Enums']["priority_level"],"status"?: Database["public"]['Enums']["task_status"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_organization_id_customer_id_fkey"
      columns: ["organization_id","customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "tasks_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_organization_id_opportunity_id_fkey"
      columns: ["organization_id","opportunity_id"]
isOneToOne: false
      referencedRelation: "opportunities"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"time_off": {
                  Row: {
                    "created_at": string,"ends_at": string,"id": string,"organization_id": string,"professional_id": string,"reason": string | null,"starts_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"ends_at": string,"id"?: string,"organization_id": string,"professional_id": string,"reason"?: string | null,"starts_at": string
                  }
                  Update: {
                    "created_at"?: string,"ends_at"?: string,"id"?: string,"organization_id"?: string,"professional_id"?: string,"reason"?: string | null,"starts_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "time_off_organization_id_professional_id_fkey"
      columns: ["organization_id","professional_id"]
isOneToOne: false
      referencedRelation: "professionals"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"working_hours": {
                  Row: {
                    "end_time": string,"id": string,"organization_id": string,"professional_id": string,"start_time": string,"weekday": number
                  }
                  ComputedFields: never
                  Insert: {
                    "end_time": string,"id"?: string,"organization_id": string,"professional_id": string,"start_time": string,"weekday": number
                  }
                  Update: {
                    "end_time"?: string,"id"?: string,"organization_id"?: string,"professional_id"?: string,"start_time"?: string,"weekday"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "working_hours_organization_id_professional_id_fkey"
      columns: ["organization_id","professional_id"]
isOneToOne: false
      referencedRelation: "professionals"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "ai_user_messages_since":
{ Args: { "p_org": string,"p_since": string }; Returns: number
                           },
"consume_rate_limit":
{ Args: { "p_bucket": string,"p_limit": number,"p_window_seconds": number }; Returns: boolean
                           },
"create_organization":
{ Args: { "p_country": string,"p_currency": string,"p_locale": string,"p_modules": (string)[],"p_name": string,"p_segment": string,"p_slug": string,"p_timezone": string }; Returns: string
                           },
"create_public_booking":
{ Args: { "p_email": string,"p_full_name": string,"p_idempotency_key": string,"p_notes": string,"p_phone": string,"p_professional_id": string,"p_service_id": string,"p_slug": string,"p_starts_at": string }; Returns: Json
                           },
"delete_organization":
{ Args: { "p_confirm_name": string,"p_org": string }; Returns: undefined
                           },
"get_booking_page":
{ Args: { "p_slug": string }; Returns: Json
                           },
"get_booking_schedule":
{ Args: { "p_from": string,"p_professional_id": string,"p_slug": string,"p_to": string }; Returns: Json
                           },
"replace_working_hours":
{ Args: { "p_professional_id": string,"p_rows": Json }; Returns: undefined
                           },
"set_professional_services":
{ Args: { "p_professional_id": string,"p_service_ids": (string)[] }; Returns: undefined
                           }
          }
          Enums: {
            "activity_type": "note"|"customer_created"|"customer_updated"|"customer_archived"|"customer_restored"|"opportunity_created"|"opportunity_stage_changed"|"task_created"|"task_completed"|"task_reopened"|"appointment_created"|"appointment_status_changed"|"appointment_rescheduled","ai_message_role": "user"|"assistant","appointment_status": "scheduled"|"confirmed"|"completed"|"cancelled"|"no_show","member_role": "owner"|"admin"|"member","opportunity_stage": "new"|"in_conversation"|"proposal_sent"|"negotiation"|"won"|"lost","priority_level": "low"|"medium"|"high","task_status": "open"|"done"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "activity_type": ["note", "customer_created", "customer_updated", "customer_archived", "customer_restored", "opportunity_created", "opportunity_stage_changed", "task_created", "task_completed", "task_reopened", "appointment_created", "appointment_status_changed", "appointment_rescheduled"],"ai_message_role": ["user", "assistant"],"appointment_status": ["scheduled", "confirmed", "completed", "cancelled", "no_show"],"member_role": ["owner", "admin", "member"],"opportunity_stage": ["new", "in_conversation", "proposal_sent", "negotiation", "won", "lost"],"priority_level": ["low", "medium", "high"],"task_status": ["open", "done"]
          }
        }
} as const
