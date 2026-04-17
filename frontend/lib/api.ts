import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("mb_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("mb_token");
      localStorage.removeItem("mb_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const login = (username: string, password: string) =>
  api.post("/api/auth/login", { username, password });

// Trains
export const getTrains = (status?: string) =>
  api.get("/api/trains", { params: status ? { status } : {} });
export const getTrainStats = () => api.get("/api/trains/stats");

// Schedule
export const generateSchedule = (data: any) => api.post("/api/schedule/generate", data);
export const getLatestSchedule = () => api.get("/api/schedule/latest");
export const getScheduleHistory = (limit = 10) => api.get("/api/schedule/history", { params: { limit } });

// Maintenance
export const getPredictions = () => api.get("/api/maintenance/predictions");
export const getMaintenanceLogs = () => api.get("/api/maintenance/logs");
export const getUpcomingMaintenance = (days = 14) => api.get("/api/maintenance/upcoming", { params: { days_threshold: days } });
export const getMaintenanceStats = () => api.get("/api/maintenance/stats");
export const addMaintenanceLog = (data: any) => api.post("/api/maintenance/logs", data);

// Alerts
export const getAlerts = (resolved = false) => api.get("/api/alerts", { params: { resolved } });
export const getAlertStats = () => api.get("/api/alerts/stats");
export const resolveAlert = (id: string) => api.post(`/api/alerts/resolve/${id}`);
export const autoGenerateAlerts = () => api.post("/api/alerts/auto-generate");

// Simulation
export const runSimulation = (data: any) => api.post("/api/simulation/run", data);
export const getSimulationHistory = () => api.get("/api/simulation/history");

// Reports
export const generateReport = (data: any) => api.post("/api/reports/generate", data);
export const explainSchedule = () => api.post("/api/reports/explain-schedule");
export const getReportHistory = () => api.get("/api/reports/history");
