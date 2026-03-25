import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextFetchEvent, NextRequest } from 'next/server';

const clerk = clerkMiddleware();

export default function middleware(request: NextRequest, event: NextFetchEvent) {
    if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
        return NextResponse.next();
    }

    return clerk(request, event);
}

export const config = {
    matcher: ['/((?!_next|.*\\..*).*)'],
};
