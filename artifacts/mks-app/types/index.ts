export type UserRole = 'admin' | 'editor' | 'viewer';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  createdAt: string;
  agentName?: string;
}

export type FieldType = 'text' | 'date' | 'number' | 'select' | 'textarea' | 'phone' | 'email';

export interface TemplateField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface Template {
  id: string;
  name: string;
  serviceType: string;
  description?: string;
  fields: TemplateField[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  active: boolean;
}

export type DocumentStatus = 'draft' | 'active' | 'archived';

export interface Document {
  id: string;
  title: string;
  templateId: string;
  templateName: string;
  serviceType: string;
  fields: Record<string, string>;
  studentName: string;
  school: string;
  academicYear: string;
  agent: string;
  date: string;
  status: DocumentStatus;
  driveFileId?: string;
  driveFileUrl?: string;
  notes?: string;
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
