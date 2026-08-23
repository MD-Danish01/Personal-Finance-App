import axios from "axios";
import { getSetuAccessToken } from "./auth";

const setuClient = axios.create({
  baseURL: process.env.SETU_BASE_URL,
  timeout: 15000,
});

setuClient.interceptors.request.use(async (config) => {
  const token = await getSetuAccessToken();
  config.headers.Authorization = `Bearer ${token}`;
  config.headers["x-product-instance-id"] =
    process.env.SETU_PRODUCT_INSTANCE_ID;
  return config;
});

setuClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response) {
      console.error(
        "Setu API error:",
        error.response.status,
        JSON.stringify(error.response.data),
      );
    } else {
      console.error("Setu API error:", error.message);
    }
    return Promise.reject(error);
  },
);

export { setuClient };
