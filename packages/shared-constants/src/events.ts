/**
 * Socket.IO event names shared between API and web client.
 * Phase 1 stubs the namespace; real events are added in Phase 6 (Notifications).
 */
export const SOCKET_EVENTS = {
  // ── Connection lifecycle ──
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',

  // ── Notifications (Phase 6) ──
  // NOTIFICATION_NEW: 'notification:new',
  // NOTIFICATION_READ: 'notification:read',

  // ── Workflow (Phase 5) ──
  // WORKFLOW_STEP_UPDATED: 'workflow:step_updated',
  // WORKFLOW_COMPLETED: 'workflow:completed',

  // ── Dashboard (Phase 7) ──
  // DASHBOARD_REFRESH: 'dashboard:refresh',
} as const;

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];
