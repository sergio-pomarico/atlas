import type { RawAxiosRequestHeaders } from "axios";
import type { HTTPClientConfig } from "./axios";

/**
 *
 * @param {string} url
 * @return {HTTPClientConfig}
 */
export const buildConfig = (
  url: string,
  customHeaders?: RawAxiosRequestHeaders,
  withCredentials?: boolean
): HTTPClientConfig => {
  /**
   * build Axios config request
   */
  const config: HTTPClientConfig = {
    baseURL: url,
    withCredentials,
    timeout: 30_000,
    headers: customHeaders,
  };
  return config;
};
