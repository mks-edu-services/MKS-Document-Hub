import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { AppUser, Document, ServiceType, Template, UserRole } from '@/types';
import { getFirebaseDb } from './firebase';
import { DEFAULT_SERVICE_TYPES, SERVICE_TYPES_COLLECTION, sortServiceTypes } from './serviceTypes';

function db() {
  const d = getFirebaseDb();
  if (!d) throw new Error('Firebase not configured');
  return d;
}

function stripUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;
}

// ── Users ──────────────────────────────────────────────────────────────────

export async function createUser(user: Omit<AppUser, 'createdAt'>): Promise<void> {
  await setDoc(doc(db(), 'users', user.uid), stripUndefined({
    ...user,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    accessStatus: user.accessStatus ?? 'allowed',
  }));
}

export async function getUser(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db(), 'users', uid));
  return snap.exists() ? (snap.data() as AppUser) : null;
}

export async function getAllUsers(): Promise<AppUser[]> {
  const snap = await getDocs(query(collection(db(), 'users'), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => d.data() as AppUser);
}

export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
  await updateDoc(doc(db(), 'users', uid), { role, updatedAt: new Date().toISOString() });
}

export async function updateUserProfile(
  uid: string,
  data: Partial<Pick<AppUser, 'displayName' | 'username' | 'phoneNumber' | 'agentName' | 'photoURL' | 'accessStatus'>>,
): Promise<void> {
  await updateDoc(doc(db(), 'users', uid), stripUndefined({ ...data, updatedAt: new Date().toISOString() }));
}

export async function deleteUserProfile(uid: string): Promise<void> {
  await deleteDoc(doc(db(), 'users', uid));
}

// ── Templates ──────────────────────────────────────────────────────────────

export async function createTemplate(template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const now = new Date().toISOString();
  const ref = await addDoc(collection(db(), 'templates'), stripUndefined({ ...template, createdAt: now, updatedAt: now }));
  return ref.id;
}

export async function getTemplates(activeOnly = true): Promise<Template[]> {
  let q = activeOnly
    ? query(collection(db(), 'templates'), where('active', '==', true), orderBy('createdAt', 'desc'))
    : query(collection(db(), 'templates'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Template));
}

export async function getTemplate(id: string): Promise<Template | null> {
  const snap = await getDoc(doc(db(), 'templates', id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Template) : null;
}

export async function updateTemplate(id: string, data: Partial<Template>): Promise<void> {
  await updateDoc(doc(db(), 'templates', id), stripUndefined({ ...data, updatedAt: new Date().toISOString() }));
}

export async function deleteTemplate(id: string): Promise<void> {
  await deleteDoc(doc(db(), 'templates', id));
}

// ── Service Types ─────────────────────────────────────────────────────────

function serviceTypeCollection() {
  return collection(db(), SERVICE_TYPES_COLLECTION);
}

export async function ensureDefaultServiceTypes(): Promise<void> {
  const snap = await getDocs(serviceTypeCollection());
  const existing = new Set(snap.docs.map((document) => document.id));
  const now = new Date().toISOString();
  await Promise.all(
    DEFAULT_SERVICE_TYPES.filter((serviceType) => !existing.has(serviceType.id)).map((serviceType) =>
      setDoc(
        doc(db(), SERVICE_TYPES_COLLECTION, serviceType.id),
        stripUndefined({
          ...serviceType,
          createdAt: now,
          updatedAt: now,
        }),
      ),
    ),
  );
}

export async function getServiceTypes(activeOnly = true): Promise<ServiceType[]> {
  const snap = await getDocs(query(serviceTypeCollection(), orderBy('sortOrder', 'asc')));
  const items = sortServiceTypes(
    snap.docs.map((document) => ({ id: document.id, ...document.data() } as ServiceType)),
  );
  return activeOnly ? items.filter((item) => item.active) : items;
}

export async function createServiceType(serviceType: Omit<ServiceType, 'id' | 'createdAt' | 'updatedAt'> & { id: string }): Promise<string> {
  const now = new Date().toISOString();
  const ref = doc(db(), SERVICE_TYPES_COLLECTION, serviceType.id);
  await setDoc(ref, stripUndefined({ ...serviceType, createdAt: now, updatedAt: now }));
  return ref.id;
}

export async function updateServiceType(id: string, data: Partial<ServiceType>): Promise<void> {
  await updateDoc(doc(db(), SERVICE_TYPES_COLLECTION, id), stripUndefined({ ...data, updatedAt: new Date().toISOString() }));
}

export async function deleteServiceType(id: string): Promise<void> {
  await deleteDoc(doc(db(), SERVICE_TYPES_COLLECTION, id));
}

export function subscribeToServiceTypes(
  callback: (serviceTypes: ServiceType[]) => void,
  activeOnly = false,
  onError?: (err: Error) => void
): () => void {
  const q = query(serviceTypeCollection(), orderBy('sortOrder', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const items = sortServiceTypes(
        snap.docs.map((document) => ({ id: document.id, ...document.data() } as ServiceType)),
      );
      callback(activeOnly ? items.filter((item) => item.active) : items);
    },
    (err) => onError?.(err)
  );
}

// ── Documents ──────────────────────────────────────────────────────────────

export async function createDocument(doc_: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const now = new Date().toISOString();
  const ref = await addDoc(collection(db(), 'documents'), stripUndefined({ ...doc_, createdAt: now, updatedAt: now }));
  return ref.id;
}

export async function getDocuments(): Promise<Document[]> {
  const snap = await getDocs(query(collection(db(), 'documents'), orderBy('updatedAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Document));
}

export async function getDocument(id: string): Promise<Document | null> {
  const snap = await getDoc(doc(db(), 'documents', id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Document) : null;
}

export async function updateDocument(id: string, data: Partial<Document>): Promise<void> {
  await updateDoc(doc(db(), 'documents', id), stripUndefined({ ...data, updatedAt: new Date().toISOString() }));
}

export async function deleteDocument(id: string): Promise<void> {
  await deleteDoc(doc(db(), 'documents', id));
}

// ── Real-time subscriptions ─────────────────────────────────────────────────

export function subscribeToDocuments(
  callback: (docs: Document[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(collection(db(), 'documents'), orderBy('updatedAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Document))),
    (err) => onError?.(err)
  );
}

export function subscribeToTemplates(
  callback: (templates: Template[]) => void,
  activeOnly = true,
  onError?: (err: Error) => void
): () => void {
  const q = activeOnly
    ? query(collection(db(), 'templates'), where('active', '==', true), orderBy('createdAt', 'desc'))
    : query(collection(db(), 'templates'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Template))),
    (err) => onError?.(err)
  );
}
