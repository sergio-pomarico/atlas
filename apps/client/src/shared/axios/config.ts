import type { AxiosRequestConfig, RawAxiosRequestHeaders } from "axios";

/**
 *
 * @param {string} url
 * @return {AxiosRequestConfig}
 */
export const buildConfig = (
  url: string,
  customHeaders?: RawAxiosRequestHeaders,
  withCredentials?: boolean
): AxiosRequestConfig => {
  /**
   * build Axios config request
   */
  const config: AxiosRequestConfig = {
    baseURL: url,
    withCredentials,
    timeout: 30_000,
    headers: customHeaders,
  };
  return config;
};
