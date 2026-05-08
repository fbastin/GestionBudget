import axios from "axios";

const api = axios.create({
  baseURL: `http://${window.location.hostname}:8000`,
});

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

export const exportCSV = () => window.open(`http://${window.location.hostname}:8000/export/csv`, "_blank");

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
