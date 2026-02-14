import { Result } from "@api/domain/result.ts";

export async function tryCatch<T, E = Error>(
  promise: Promise<T>
): Promise<Result<T, E>> {
  try {
    const data = await promise;
    return Result.success(data);
  } catch (error) {
    return Result.err(error as E);
  }
}
