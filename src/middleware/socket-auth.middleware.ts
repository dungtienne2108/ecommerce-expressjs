import { Socket } from 'socket.io';

import { ExtendedError } from 'socket.io/dist/namespace';

import { prisma } from '../config/prisma';
import { JwtUtils } from '../utils/jwt.util';

 

/**

 * Extended Socket với user info

 */

export interface AuthenticatedSocket extends Socket {

  user?: {

    id: string;

    email: string;

    [key: string]: any;

  };

}

 

/**

 * Middleware xác thực JWT token cho Socket.IO

 * Token có thể được gửi qua:

 * 1. Query parameter: ?token=xxx

 * 2. Auth header: Authorization: Bearer xxx

 * 3. Handshake auth: { auth: { token: 'xxx' } }

 */

export const socketAuthMiddleware = async (

  socket: AuthenticatedSocket,

  next: (err?: ExtendedError) => void

) => {

  try {

    // Lấy token từ nhiều nguồn

    const token =

      socket.handshake.auth?.token || // From auth object

      socket.handshake.query?.token || // From query param

      socket.handshake.headers?.authorization?.replace('Bearer ', ''); // From header

 

    if (!token || typeof token !== 'string') {

      return next(new Error('Authentication error: Token không hợp lệ'));

    }

 

    // Verify JWT token

    const decoded = JwtUtils.verifyAccessToken(token);

    if (!decoded || typeof decoded !== 'object' || !decoded.userId) {

      return next(new Error('Authentication error: Token không hợp lệ'));

    }

 

    // Lấy thông tin user từ database

    const user = await prisma.user.findUnique({

      where: { id: decoded.userId },

      select: {

        id: true,

        email: true,

        firstName: true,

        lastName: true,

        status: true,

        roles: {

          include: {

            role: true,

          },

        },

      },

    });

 

    if (!user) {

      return next(new Error('Authentication error: User không tồn tại'));

    }

 

    if (user.status !== 'ACTIVE') {

      return next(new Error('Authentication error: User không hoạt động'));

    }

 

    // Gắn user vào socket

    socket.user = {

      id: user.id,

      email: user.email,

      firstName: user.firstName,

      lastName: user.lastName,

      status: user.status,

      roles: user.roles.map((ur) => ur.role.type),

    };

 

    console.log(`✅ Socket authenticated: ${user.email} (${socket.id})`);

    next();

  } catch (error: any) {

    console.error('Socket authentication error:', error.message);

    next(new Error('Authentication error: ' + error.message));

  }

};

 

/**

 * Optional auth middleware - không bắt buộc phải có token

 */

export const socketOptionalAuthMiddleware = async (

  socket: AuthenticatedSocket,

  next: (err?: ExtendedError) => void

) => {

  try {

    const token =

      socket.handshake.auth?.token ||

      socket.handshake.query?.token ||

      socket.handshake.headers?.authorization?.replace('Bearer ', '');

 

    if (!token) {

      // Không có token, cho phép kết nối như guest

      console.log(`⚠️ Socket connected as guest: ${socket.id}`);

      return next();

    }

 

    // Có token thì verify

    const decoded = JwtUtils.verifyAccessToken(token);

    if (decoded && typeof decoded === 'object' && decoded.userId) {

      const user = await prisma.user.findUnique({

        where: { id: decoded.userId },

        select: {

          id: true,

          email: true,

          firstName: true,

          lastName: true,

          status: true,

        },

      });

 

      if (user && user.status === 'ACTIVE') {

        socket.user = user;

        console.log(`✅ Socket authenticated: ${user.email} (${socket.id})`);

      }

    }

 

    next();

  } catch (error) {

    // Có lỗi nhưng vẫn cho kết nối

    console.warn('Socket optional auth warning:', error);

    next();

  }

};