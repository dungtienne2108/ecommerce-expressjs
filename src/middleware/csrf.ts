import { Request, Response, NextFunction } from 'express';
import csurf from 'csurf';

export const csrfProtection = csurf({
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    },
});