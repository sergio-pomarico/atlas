export interface UserEntity {
  readonly id: string;
  email: string;
  phone: number;
  verified?: boolean;
  readonly sessionId?: string;
  status: UserStatusType;
  readonly failedLoginAttempts: number;
  password: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const UserStatus = {
  INACTIVE: "INACTIVE",
  ACTIVE: "ACTIVE",
  BLOCKED: "BLOCKED",
} as const;

export type UserStatusType = (typeof UserStatus)[keyof typeof UserStatus];
