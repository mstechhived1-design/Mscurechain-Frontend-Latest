export interface SupportTicket {
  _id: string;
  subject: string;
  message: string;
  category: string;
  type?: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "in-progress" | "resolved" | "closed";
  name?: string;
  role?: string;
  hospital?: {
    _id: string;
    name: string;
    hospitalId?: string;
  };
  requester: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  attachments: string[];
  replies: Array<{
    sender: {
      _id: string;
      name: string;
      role: string;
    };
    message: string;
    attachments: string[];
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
  ticketId?: string;
}

export interface CreateTicketRequest {
  subject: string;
  message: string;
  category: string;
  priority: string;
  attachments?: File[];
}
