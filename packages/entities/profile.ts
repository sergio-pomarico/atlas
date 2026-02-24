export interface ProfileEntity {
  readonly id: string;
  userId: string;
  names: string;
  lastName: string;
  avatar: string;
  createdAt?: Date;
  updatedAt?: Date;
}
