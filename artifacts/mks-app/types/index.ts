export type UserRole = 'admin' | 'editor' | 'viewer';
export type LanguageCode = 'my' | 'en';
export type AccountAccessStatus = 'allowed' | 'pending' | 'denied';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  username?: string;
  phoneNumber?: string;
  role: UserRole;
  accessStatus?: AccountAccessStatus;
  photoURL?: string;
  createdAt: string;
  updatedAt?: string;
  agentName?: string;
}

export type FieldType = 'text' | 'date' | 'number' | 'select' | 'textarea' | 'phone' | 'email';

export interface TemplateField {
  id: string;
  label: string;
  labelMy?: string;
  labelEn?: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
  placeholderMy?: string;
  placeholderEn?: string;
  description?: string;
  descriptionMy?: string;
  descriptionEn?: string;
}

export interface Template {
  id: string;
  name: string;
  nameMy?: string;
  nameEn?: string;
  serviceType: string;
  description?: string;
  descriptionMy?: string;
  descriptionEn?: string;
  fields: TemplateField[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  active: boolean;
}

export type DocumentStatus = 'draft' | 'active' | 'archived';
export type DriveSyncStatus = 'pending' | 'synced' | 'failed';

export interface Document {
  id: string;
  title: string;
  templateId: string;
  templateName: string;
  serviceType: string;
  fields: Record<string, string>;
  index?: string;
  year?: string;
  seatPrefix?: string;
  seatNo?: string;
  seatNumber?: string;
  certificateNo?: string;
  studentName: string;
  fatherName?: string;
  township?: string;
  submittedBy?: string;
  submittedDate?: string;
  receivedDate?: string;
  returnedDate?: string;
  issuedBy?: string;
  school: string;
  academicYear: string;
  agent: string;
  date: string;
  status: DocumentStatus;
  driveFileId?: string;
  driveFileUrl?: string;
  driveFileName?: string;
  driveFolderLink?: string;
  driveFolderPath?: string;
  driveMatchMethod?: string;
  driveMatchConfidence?: number;
  scanFileId?: string;
  scanFileName?: string;
  scanFileUrl?: string;
  scanPreviewUrl?: string;
  scanSearchKey?: string;
  driveSyncStatus?: DriveSyncStatus;
  driveSyncError?: string;
  driveSyncedAt?: string;
  notes?: string;
  sr?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface FilterState {
  serviceType: string;
  school: string;
  agent: string;
  academicYear: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  searchQuery: string;
}
