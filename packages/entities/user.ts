import type { ProfileEntity } from "./profile.ts";

export interface UserEntity {
  readonly id: string;
  name: string;
  email: string;
  phone: number;
  verified: boolean;
  active: boolean;
  password: string;
  profile?: ProfileEntity;
  createdAt?: Date;
  updatedAt?: Date;
}
