/**
 * Real-Time Socket.IO & Notification Dispatcher (FR-ESS-07)
 * Emits in-app status-change events and dashboard refresh signals to connected clients.
 */

import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { SOCKET_EVENTS } from '@am-pms/shared-constants';
import { logger } from '../common/utils/logger.js';

let io: SocketIOServer | null = null;

export function initSocketServer(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    logger.debug({ socketId: socket.id }, 'Socket.IO client connected');

    socket.on('join:user', (userId: string) => {
      socket.join(`user:${userId}`);
    });

    socket.on('disconnect', () => {
      logger.debug({ socketId: socket.id }, 'Socket.IO client disconnected');
    });
  });

  return io;
}

export function getSocketServer(): SocketIOServer | null {
  return io;
}

export function setSocketServer(server: SocketIOServer | null): void {
  io = server;
}

/**
 * Dispatches an in-app status change notification to a specific employee (FR-ESS-07).
 */
export function emitRequestStatusChange(
  userId: string,
  data: {
    requestId: string;
    requestNumber: string;
    type: string;
    status: string;
    message?: string;
  },
): void {
  if (io) {
    io.to(`user:${userId}`).emit(SOCKET_EVENTS.REQUEST_STATUS_CHANGED, {
      ...data,
      timestamp: new Date().toISOString(),
    });
    io.to(`user:${userId}`).emit(SOCKET_EVENTS.NOTIFICATION_NEW, {
      title: 'Request Status Updated',
      body: data.message || `Request ${data.requestNumber} status changed to ${data.status}`,
      type: 'request_status',
      referenceId: data.requestId,
      timestamp: new Date().toISOString(),
    });
  }
}
