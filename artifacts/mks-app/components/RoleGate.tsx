import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';

const roleLevel: Record<UserRole, number> = {
  admin: 3,
  editor: 2,
  viewer: 1,
};

interface RoleGateProps {
  minRole?: UserRole;
  exactRole?: UserRole;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGate({ minRole, exactRole, children, fallback = null }: RoleGateProps) {
  const { user } = useAuth();
  if (!user) return <>{fallback}</>;

  if (exactRole && user.role !== exactRole) return <>{fallback}</>;
  if (minRole && roleLevel[user.role] < roleLevel[minRole]) return <>{fallback}</>;

  return <>{children}</>;
}

export function useCanEdit() {
  const { user } = useAuth();
  return user?.role === 'admin' || user?.role === 'editor';
}

export function useIsAdmin() {
  const { user } = useAuth();
  return user?.role === 'admin';
}
