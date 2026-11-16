import { NextResponse } from 'next/server';
import { logger } from './logger';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const handleError = (error: unknown) => {
  if (error instanceof AppError) {
    logger.error(`[AppError] ${error.message}`, { statusCode: error.statusCode });
    return NextResponse.json({ success: false, message: error.message }, { status: error.statusCode });
  }

  const message = error instanceof Error ? error.message : 'Internal Server Error';
  logger.error(`[UnhandledError] ${message}`, { error });
  return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
};
