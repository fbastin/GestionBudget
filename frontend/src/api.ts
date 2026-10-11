import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000`;

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Message returned by the API (e.g. why a deletion is refused), or the fallback
export const errorMessage = (err: unknown, fallback: string): string => {
  const detail = axios.isAxiosError(err) ? err.response?.data?.detail : undefined;
  return typeof detail === "string" ? detail : fallback;
};

export const getDashboard = () => api.get("/dashboard");
export const getLiabilities = () => api.get("/liabilities");
export const getAssets = () => api.get("/assets");
export const getHistory = () => api.get("/history");

export const updateLiability = (id: number, data: any) => api.patch("/liabilities/" + id, data);
export const createLiability = (data: any) => api.post("/liabilities", data);
export const deleteLiability = (id: number) => api.delete("/liabilities/" + id);

export const updateAsset = (id: number, data: any) => api.patch("/assets/" + id, data);
export const createAsset = (data: any) => api.post("/assets", data);
export const deleteAsset = (id: number) => api.delete("/assets/" + id);

export const addSnapshot = (data: any) => api.post("/snapshots", data);
export const deleteSnapshot = (id: number) => api.delete("/snapshots/" + id);

export const getBanks = () => api.get("/banks");
export const createBank = (data: any) => api.post("/banks", data);
export const updateBank = (id: number, data: any) => api.patch("/banks/" + id, data);
export const deleteBank = (id: number) => api.delete("/banks/" + id);

export const getCredits = () => api.get("/credits");
export const createCredit = (data: any) => api.post("/credits", data);
export const updateCredit = (id: number, data: any) => api.patch("/credits/" + id, data);
export const deleteCredit = (id: number) => api.delete("/credits/" + id);

export const getContributions = () => api.get("/contributions");
export const createContribution = (data: any) => api.post("/contributions", data);
export const updateContribution = (id: number, data: any) => api.patch("/contributions/" + id, data);
export const deleteContribution = (id: number) => api.delete("/contributions/" + id);

export const getInvestments = () => api.get("/investments");
export const createInvestment = (data: any) => api.post("/investments", data);
export const updateInvestment = (id: number, data: any) => api.patch("/investments/" + id, data);
export const deleteInvestment = (id: number) => api.delete("/investments/" + id);

export const getExpenses = () => api.get("/expenses");
export const createExpense = (data: any) => api.post("/expenses", data);
export const updateExpense = (id: number, data: any) => api.patch("/expenses/" + id, data);
export const deleteExpense = (id: number) => api.delete("/expenses/" + id);
export const getPayments = () => api.get("/payments");
export const createPayment = (data: any) => api.post("/payments", data);
export const updatePayment = (id: number, data: any) => api.patch("/payments/" + id, data);
export const deletePayment = (id: number) => api.delete("/payments/" + id);
// Replace an expense by a payment (or the reverse) in a single server-side operation
export const convertExpenseToPayment = (id: number, data: any) => api.post(`/expenses/${id}/convert-to-payment`, data);
export const convertPaymentToExpense = (id: number, data: any) => api.post(`/payments/${id}/convert-to-expense`, data);
export const exportExpensesCSV = () => window.open(`${API_BASE_URL}/export/expenses/csv`, "_blank");
export const importExpensesCSV = (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/import/expenses/csv", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const exportCSV = () => window.open(`${API_BASE_URL}/export/csv`, "_blank");

export const importCSV = (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/import/csv", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export default api;
