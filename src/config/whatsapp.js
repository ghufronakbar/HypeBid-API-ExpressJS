import axios from "axios";
import { FONNTE_API_KEY } from "../constant/fonnte.js";

export const whatsapp = axios.create({
  baseURL: "https://api.fonnte.com",
});

whatsapp.interceptors.request.use(
  (config) => {
    config.headers.Authorization = FONNTE_API_KEY;
    config.data.countryCode = "62";
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const sendWhatsapp = async (target, message) => {
  try {
    const response = await whatsapp.post("/send", {
      target,
      message,
    });
    console.log("WhatsApp response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    throw error;
  }
}