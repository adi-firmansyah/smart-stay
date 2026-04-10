interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

export enum AccessMethod {
  FACE_RECOGNITION = "FACE_RECOGNITION",
  RFID = "RFID",
  PIN = "PIN",
}

export interface Base {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface Resident extends Base {
  name: string;
  phone: string;
  room_number: number;
}

export interface CreateResidentRequest {
  name: string;
  phone: string;
  room_number: number;
  rfid_code: string;
  pin: string;
}

export interface FaceEmbedding extends Base {
  resident_id: string;
  image_path: string;
  embedding: number[];
}

export interface AccessLog extends Base {
  resident_id: string | null;
  method: AccessMethod;
  granted: boolean;
  similarity: number;
  suspicious_image_path: string | null;
  resident?: Resident | null;
}
