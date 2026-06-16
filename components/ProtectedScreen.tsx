import * as React from 'react';

import { ProtectedRole, useProtectedRoute } from '@/hooks/useProtectedRoute';

type ProtectedScreenProps = {
  allowedRoles: ProtectedRole[];
  children: React.ReactNode;
};

export function ProtectedScreen({ allowedRoles, children }: ProtectedScreenProps) {
  const canRender = useProtectedRoute(allowedRoles);

  if (!canRender) return null;

  return <>{children}</>;
}

export default ProtectedScreen;
