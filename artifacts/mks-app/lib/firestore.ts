import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { AppUser, Document, Template, UserRole } from '@/types';
import { getFirebaseDb } from './firebase';

function db() {
  const d = getFirebaseDb();
  if (!d) throw new Error('Firebase not configured');
  return d;
}

// ── Users ──────────────────────────────────────────────────────────────────

export async function createUser(user: Omit<AppUser, 'createdAt'>): Promise<void> {
  await setDoc(doc(db(), 'users', user.uid), {
    ...user,
    createdAt: new Date().toISOString(),
  });
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
  await updateDoc(doc(db(), 'users', uid), { role });
}

// ── Templates ──────────────────────────────────────────────────────────────

export async function createTemplate(template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const now = new Date().toISOString();
  const ref = await addDoc(collection(db(), 'templates'), { ...template, createdAt: now, updatedAt: now });
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
  await updateDoc(doc(db(), 'templates', id), { ...data, updatedAt: new Date().toISOString() });
}

export async function deleteTemplate(id: string): Promise<void> {
  await deleteDoc(doc(db(), 'templates', id));
}

// ── Documents ──────────────────────────────────────────────────────────────

export async function createDocument(doc_: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const now = new Date().toISOString();
  const ref = await addDoc(collection(db(), 'documents'), { ...doc_, createdAt: now, updatedAt: now });
  return ref.id;
}

export async function getDocuments(): Promise<Document[]> {
  const snap = await getDocs(query(collection(db(), 'documents'), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Document));
}

export async function getDocument(id: string): Promise<Document | null> {
  const snap = await getDoc(doc(db(), 'documents', id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Document) : null;
}

export async function updateDocument(id: string, data: Partial<Document>): Promise<void> {
  await updateDoc(doc(db(), 'documents', id), { ...data, updatedAt: new Date().toISOString() });
}

export async function deleteDocument(id: string): Promise<void> {
  await deleteDoc(doc(db(), 'documents', id));
}
