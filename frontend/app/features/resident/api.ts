import { type CreateResidentRequest, type Resident } from "@/types";

const BASE_API_URL: string = import.meta.env.VITE_API_URL;

export async function getResidents(): Promise<Resident[]> {
  const response = await fetch(`${BASE_API_URL}/residents`);

  if (!response.ok) {
    throw new Error("Gagal mengambil data penghuni dari server");
  }

  return response.json();
}

export const createResident = async (
  payload: CreateResidentRequest,
): Promise<Resident> => {
  const response: Response = await fetch(`${BASE_API_URL}/residents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Gagal membuat data penghuni");
  }

  return response.json();
};

export const updateResident = async (
  id: string,
  payload: CreateResidentRequest,
): Promise<Resident> => {
  const response: Response = await fetch(`${BASE_API_URL}/residents/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Gagal memperbarui data penghuni");
  }

  return response.json();
};

export const deleteResident = async (id: string): Promise<void> => {
  const response: Response = await fetch(`${BASE_API_URL}/residents/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Gagal menghapus data penghuni");
  }
};

export const getResidentDetail = async (id: string): Promise<Resident> => {
  const response: Response = await fetch(`${BASE_API_URL}/residents/${id}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Penghuni tidak ditemukan.");
  }

  return response.json();
};

export const getFaceEmbeddings = async (residentId: string): Promise<any[]> => {
  const response: Response = await fetch(
    `${BASE_API_URL}/residents/${residentId}/face-embeddings`,
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Gagal mengambil data sampel wajah.");
  }

  return response.json();
};

export const deleteFaceEmbedding = async (
  residentId: string,
  embeddingId: string,
): Promise<void> => {
  const response: Response = await fetch(
    `${BASE_API_URL}/residents/${residentId}/face-embeddings/${embeddingId}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Gagal menghapus sampel wajah.");
  }
};

export const uploadFaceSamples = async (
  residentId: string,
  files: FileList,
): Promise<any> => {
  const formData = new FormData();

  Array.from(files).forEach((file) => {
    formData.append("files", file);
  });

  const response: Response = await fetch(
    `${BASE_API_URL}/residents/${residentId}/face-embeddings`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Gagal mengunggah sampel wajah.");
  }

  return response.json();
};
