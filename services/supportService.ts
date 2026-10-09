// services/supportService.ts
import { apiRequest } from "@/services/api";

export interface SupportTicketSummary {
  id: string;
  raw_id: number;
  ticket_no: string;
  subject: string;
  category: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  created_at: string;
  updated_at: string;
  last_message: string;
  last_message_time: string;
  last_sender: string;
  message_count: number;
}

export interface SupportChatMessage {
  id: string;
  ticket_id: number;
  sender_type: "user" | "admin";
  sender_name: string;
  sender_role: string;
  text: string;
  created_at: string;
  is_admin: boolean;
}

export interface TicketDetailsResponse {
  ticket: SupportTicketSummary;
  messages: SupportChatMessage[];
}

export const supportService = {
  async getMyTickets(): Promise<SupportTicketSummary[]> {
    return apiRequest<SupportTicketSummary[]>("/api/v1/support/my-tickets");
  },

  async getTicketDetails(ticketId: string | number): Promise<TicketDetailsResponse> {
    return apiRequest<TicketDetailsResponse>(`/api/v1/support/tickets/${ticketId}`);
  },

  async createTicket(payload: {
    subject: string;
    message: string;
    category?: string;
  }): Promise<{ status: string; message: string; ticket: SupportTicketSummary; initial_message: SupportChatMessage }> {
    return apiRequest("/api/v1/support/tickets", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async sendTicketMessage(
    ticketId: string | number,
    message: string
  ): Promise<{ status: string; message: SupportChatMessage }> {
    return apiRequest(`/api/v1/support/tickets/${ticketId}/messages`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  },
};
