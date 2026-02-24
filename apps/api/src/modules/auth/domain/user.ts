import type { UserEntity, UserStatusType } from "@atlas/entities/user.ts";
import { UserStatus } from "@atlas/entities/user.ts";

export class User
  implements Omit<UserEntity, "verified" | "failedLoginAttempts" | "status">
{
  readonly id: string;
  readonly email: string;
  readonly phone: number;
  readonly password: string;
  private readonly _verified: boolean;
  readonly sessionId?: string;
  private _status: UserStatusType;
  private _failedLoginAttempts: number;
  createdAt?: Date;
  updatedAt?: Date;

  constructor(props: UserEntity) {
    this.id = props.id;
    this.email = props.email;
    this.phone = props.phone;
    this.password = props.password;
    this._verified = props.verified ?? false;
    this.sessionId = props.sessionId;
    this._status = props.status;
    this._failedLoginAttempts = props.failedLoginAttempts;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  equals(other: User): boolean {
    return this.id === other.id;
  }

  //increment failed login attempts, if the user reaches 5 failed attempts, block the user
  incrementFailedLoginAttempts(): void {
    this._failedLoginAttempts += 1;
    if (this._failedLoginAttempts >= 5) {
      this._status = UserStatus.BLOCKED;
    }
  }

  //reset failed login attempts
  resetFailedLoginAttempts(): void {
    this._failedLoginAttempts = 0;
  }

  //check if the user is blocked
  isBlocked(): boolean {
    return this._status === UserStatus.BLOCKED;
  }

  //check if the user is verified
  isVerified(): boolean {
    return this._verified;
  }

  toObject(): UserEntity {
    return {
      id: this.id,
      email: this.email,
      phone: this.phone,
      password: this.password,
      verified: this._verified,
      sessionId: this.sessionId,
      status: this._status,
      failedLoginAttempts: this._failedLoginAttempts,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
