export type CreatePendingPasswordResetRequestResult =
  | { type: "created"; requestId: string }
  | { type: "userNotFound" }
  | { type: "userNotEligible" }
  | { type: "infrastructureError" };

export type ActivatePasswordResetRequestResult =
  | { type: "activated" }
  | { type: "userNotEligible" }
  | { type: "requestNotActivatable" }
  | { type: "infrastructureError" };

export type CleanupPendingPasswordResetRequestsResult =
  | { type: "cleaned"; count: number }
  | { type: "infrastructureError" };

export type InvalidatePendingPasswordResetRequestResult =
  | { type: "invalidated" }
  | { type: "requestNotInvalidatable" }
  | { type: "infrastructureError" };

/**
 * IDs returned here are internal coordination values between the application
 * and persistence layers. They must never cross an HTTP boundary.
 */
export interface PasswordRecoveryRepository {
  createPendingRequest(
    email: string,
    codeHash: string,
    now: Date
  ): Promise<CreatePendingPasswordResetRequestResult>;
  activatePendingRequest(
    requestId: string,
    now: Date
  ): Promise<ActivatePasswordResetRequestResult>;
  invalidatePendingRequest(
    requestId: string,
    now: Date
  ): Promise<InvalidatePendingPasswordResetRequestResult>;
  cleanupAbandonedPendingRequests(
    now: Date
  ): Promise<CleanupPendingPasswordResetRequestsResult>;
}
