import { NextResponse } from 'next/server';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code: number;
}

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(
    { success: true, data, code: status },
    { status }
  );
}

export function errorResponse(error: string, status = 400) {
  return NextResponse.json(
    { success: false, error, code: status },
    { status }
  );
}
