export interface SessionEntity {
  readonly id: string;
  userId: string;
  ipAddress: string;
  userAgent: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
