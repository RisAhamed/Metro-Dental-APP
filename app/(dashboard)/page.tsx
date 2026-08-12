'use client';

import { useAuth } from '@clerk/nextjs';
import { redirect } from 'next/navigation';

export default function RootPage() {
  const { isLoaded, isSignedIn, sessionClaims } = useAuth();

  if (!isLoaded) return null;
  if (!isSignedIn) redirect('/sign-in');

  const role = sessionClaims?.role as string;

  if (role === 'SUPER_ADMIN') redirect('/admin');
  else redirect('/calendar');
}
