import { getFirebasePublicConfig } from "./firebase";

type SignUpResult = {
  localId: string;
  email: string;
  idToken: string;
};

async function readErrorMessage(response: Response) {
  try {
    const data = await response.json();
    return data?.error?.message || data?.error?.errors?.[0]?.message || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

export async function createFirebaseAuthUser(email: string, password: string): Promise<SignUpResult> {
  const { apiKey } = getFirebasePublicConfig();
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: true,
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json() as Promise<SignUpResult>;
}
