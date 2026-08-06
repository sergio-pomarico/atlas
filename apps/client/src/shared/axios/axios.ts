import axios, {
  type AxiosInstance,
  type AxiosInterceptorManager,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

export type HTTPClientConfig = AxiosRequestConfig & {
  baseURL: string;
  getAccessToken?: () => string | null;
};

class HTTPClientConfigurationError extends Error {
  constructor() {
    super("HTTPClient requires a non-empty baseURL.");
    this.name = "HTTPClientConfigurationError";
  }
}

/**
 * ES6 wrapper around Axios.
 * @param {import("axios").AxiosRequestConfig} config - axios Request Config.
 * @link [AxiosRequestConfig](https://github.com/axios/axios#request-config)
 */
export class HTTPClient {
  private readonly axiosInstance: AxiosInstance;

  readonly interceptors: {
    /**
     * The **Request** interceptor is called right before an HTTP request.
     * @summary
     * Useful for sending a token with each request.
     */
    request: AxiosInterceptorManager<InternalAxiosRequestConfig>;
    /**
     * The **Response** interceptor is called when an HTTP response is received.
     * @summary
     * Useful for handling responses globally.
     */
    response: AxiosInterceptorManager<AxiosResponse>;
  };

  /**
   * Creates an HTTP client instance.
   * @param {HTTPClientConfig} config
   */
  constructor(config: HTTPClientConfig) {
    if (!config?.baseURL?.trim()) {
      throw new HTTPClientConfigurationError();
    }
    const { getAccessToken, ...axiosConfig } = config;
    this.axiosInstance = axios.create(axiosConfig);
    this.interceptors = this.axiosInstance.interceptors;

    if (getAccessToken) {
      this.interceptors.request.use((config) => {
        const accessToken = getAccessToken();
        if (accessToken) {
          config.headers.set("Authorization", accessToken);
        } else {
          config.headers.delete("Authorization");
        }
        return config;
      });
    }
  }

  /**
   * Generic request.
   * @template T - `TYPE`: expected object.
   * @template B - `BODY`: request body object.
   * @param {import("axios").AxiosRequestConfig} [config] - axios request configuration.
   * @returns {Promise<AxiosResponse<T>>} - HTTP axios response.
   */
  // fallow-ignore-next-line unused-class-member
  request<T = unknown, B = unknown>(
    config: AxiosRequestConfig<B>
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.request<T, AxiosResponse<T>, B>(config);
  }

  /**
   * HTTP GET method.
   * @template T - `TYPE`: expected object.
   * @param {string} url - endpoint you want to reach.
   * @param {import("axios").AxiosRequestConfig} [config] - axios request configuration.
   * @returns {Promise<AxiosResponse<T>>} HTTP `axios` response.
   */
  // fallow-ignore-next-line unused-class-member
  get<T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.get<T>(url, config);
  }

  /**
   * HTTP POST method.
   * @template T - `TYPE`: expected object.
   * @template B - `BODY`: body request object.
   * @param {string} url - endpoint you want to reach.
   * @param {B} data - payload to send as the request body.
   * @param {import("axios").AxiosRequestConfig} [config] - axios request configuration.
   * @returns {Promise<AxiosResponse<T>>} - HTTP [axios] response.
   */
  post<T, B>(
    url: string,
    data: B,
    config?: AxiosRequestConfig<B>
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.post<T, AxiosResponse<T>, B>(url, data, config);
  }

  /**
   * HTTP PUT method.
   * @template T - `TYPE`: expected object.
   * @template B - `BODY`: body request object.
   * @param {string} url - endpoint you want to reach.
   * @param {B} data - payload to send as the request body.
   * @param {import("axios").AxiosRequestConfig} [config] - axios request configuration.
   * @returns {Promise<AxiosResponse<T>>} - HTTP [axios] response.
   */
  // fallow-ignore-next-line unused-class-member
  put<T, B>(
    url: string,
    data: B,
    config?: AxiosRequestConfig<B>
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.put<T, AxiosResponse<T>, B>(url, data, config);
  }

  /**
   * HTTP PATCH method.
   * @template T - `TYPE`: expected object.
   * @template B - `BODY`: body request object.
   * @param {string} url - endpoint you want to reach.
   * @param {B} data - payload to send as the request body.
   * @param {import("axios").AxiosRequestConfig} [config] - axios request configuration.
   * @returns {Promise<AxiosResponse<T>>} - HTTP [axios] response.
   */
  // fallow-ignore-next-line unused-class-member
  patch<T, B>(
    url: string,
    data: B,
    config?: AxiosRequestConfig<B>
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.patch<T, AxiosResponse<T>, B>(url, data, config);
  }

  /**
   * HTTP DELETE method, `statusCode`: 204 No Content.
   * @template T - `TYPE`: expected object.
   * @param {string} url - endpoint you want to reach.
   * @param {import("axios").AxiosRequestConfig} [config] - axios request configuration.
   * @returns {Promise<AxiosResponse<T>>} - HTTP [axios] response.
   */
  // fallow-ignore-next-line unused-class-member
  delete<T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.delete<T>(url, config);
  }
}
