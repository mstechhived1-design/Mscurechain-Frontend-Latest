---
description: Implementation plan for the Multi-Role Support System
---

# Support System Implementation Plan

## Objective
Implement a unified support ticket system where Doctors, Help Desk, Front Desk, and Hospital Admins can raise tickets, and Super Admins can view and resolve them.

## 1. Backend Integration (Frontend Services)
- **File**: `lib/integrations/services/support.service.ts`
- **Updates**:
  - Add `getAllTickets()` method for Super Admin.
  - Add `replyToTicket(id, message, attachments)` method.
  - Add `resolveTicket(id)` method.
  - Add `updateTicketStatus(id, status)` method.

## 2. Shared Components
- **Directory**: `next_frontend/components/support` (Create if missing)
- **Components**:
  - `TicketList.tsx`: Reusable list with search, status filters, and pagination.
  - `TicketDetailView.tsx`: Displays ticket info, conversation history (chat style), and action buttons (Reply, Resolve).
  - `CreateTicketForm.tsx`: Form with Subject, Category, Description, and File Upload (3 max).
  - `StatusBadge.tsx`: Consistent styling for Open/Resolved/etc.

## 3. Super Admin Implementation
- **Base Route**: `/admin/support`
- **Pages**:
  - `page.tsx`: Dashboard showing **All** tickets.
  - `[id]/page.tsx`: Detailed view to reply and resolve tickets.

## 4. Hospital Admin Implementation
- **Base Route**: `/hospital-admin/support`
- **Aesthetic**: Sci-Fi / Protocol Theme.
- **Pages**:
  - `page.tsx`: List of "My Tickets" (Hospital Admin's tickets).
  - `create/page.tsx`: Form to raise a new ticket.
  - `[id]/page.tsx`: View conversation and reply.

## 5. Doctor Implementation
- **Base Route**: `/doctor/support`
- **Pages**:
  - `page.tsx`: List of "My Tickets".
  - `create/page.tsx`: Form to raise a new ticket.
  - `[id]/page.tsx`: View conversation and reply.

## 6. Help Desk / Staff Implementation
- **Base Route**: `/helpdesk/support` or `/staff/support`
- **Pages**:
  - `page.tsx`: List of "My Tickets".
  - `create/page.tsx`: Form to raise a new ticket.
  - `[id]/page.tsx`: View conversation and reply.

## 7. Workflow Steps
1.  **Service Layer**: Update `support.service.ts` to handle all required API calls.
2.  **Components**: Build the shared UI components to ensure consistency and speed up implementation.
3.  **Super Admin**: Implement the core management interface first.
// turbo
4.  **Role Expansion**: Roll out the support pages to Hospital Admin, Doctor, and Help Desk, adapting the "Sci-Fi" theme for Hospital Admin where necessary.

