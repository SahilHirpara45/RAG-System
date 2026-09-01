import axios from "axios";

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const API_BASE_URL = RAW_API_URL.replace(/\/+$/, "").endsWith("/api")
  ? RAW_API_URL.replace(/\/+$/, "")
  : `${RAW_API_URL.replace(/\/+$/, "")}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach auth token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 responses (expired token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const url = error.config?.url || "";
      const isAuthRequest = url.includes("/auth/login") || url.includes("/auth/register");
      const isAuthPage = window.location.pathname === "/login" || window.location.pathname === "/register";

      // Only redirect if an active session expired on a protected page
      if (!isAuthRequest && !isAuthPage) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ============================================
// Auth API
// ============================================
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),

  register: (name: string, email: string, password: string, role: string = "user") =>
    api.post("/auth/register", { name, email, password, role }),

  getMe: () => api.get("/auth/me"),
};

// ============================================
// Training API
// ============================================
export const trainingApi = {
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/training/upload-file", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  uploadURL: (url: string) =>
    api.post("/training/upload-url", { url }),

  addQnA: (question: string, answer: string) =>
    api.post("/training/add-qna", { question, answer }),

  getSources: () => api.get("/training/sources"),

  getStats: () => api.get("/training/stats"),

  deleteSource: (id: string) => api.delete(`/training/sources/${id}`),

  reset: () => api.post("/training/reset"),
};

// ============================================
// Chat API
// ============================================
export const chatApi = {
  query: (query: string, sessionId?: string) =>
    api.post("/chat/query", { query, sessionId }),

  getSessions: () => api.get("/chat/sessions"),

  getSessionMessages: (sessionId: string) =>
    api.get(`/chat/sessions/${sessionId}`),

  deleteSession: (sessionId: string) =>
    api.delete(`/chat/sessions/${sessionId}`),
};

export default api;
