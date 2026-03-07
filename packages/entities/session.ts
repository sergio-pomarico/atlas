export interface SessionEntity {
  readonly id: string;
  userId: string;
  active: boolean;
  lastLogin?: Date;
  lastLoginIp?: string;
  userAgent?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
