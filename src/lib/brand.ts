import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { BrandProfile } from '../types';

export const EMPTY_BRAND: BrandProfile = {
  name: '',
  industry: '',
  productsServices: '',
  targetAudience: '',
  valueProposition: '',
  differentiators: '',
  visualIdentity: '',
  logo: '',
  contact: '',
  tone: '',
  goals: '',
  updatedAt: 0,
};

// Límite por campo: evita prompts gigantes (costo) y documentos enormes.
export const BRAND_FIELD_MAX = 1200;
export const BRAND_LOGO_MAX = 200_000; // ~200 KB como data URL

// Los datos de MARCA viven en su propio documento (brands/{userId}), nunca dentro de
// users/{userId} ni mezclados con memorias o instrucciones del espacio PERSONAL.
const cacheKey = (userId: string) => `aps_brand_${userId}`;

export function sanitizeBrand(input: Partial<BrandProfile>): BrandProfile {
  const clean = (v: unknown) =>
    typeof v === 'string' ? v.trim().slice(0, BRAND_FIELD_MAX) : '';
  const logo =
    typeof input.logo === 'string' && input.logo.length <= BRAND_LOGO_MAX ? input.logo : '';
  return {
    name: clean(input.name).slice(0, 120),
    industry: clean(input.industry),
    productsServices: clean(input.productsServices),
    targetAudience: clean(input.targetAudience),
    valueProposition: clean(input.valueProposition),
    differentiators: clean(input.differentiators),
    visualIdentity: clean(input.visualIdentity),
    logo,
    contact: clean(input.contact),
    tone: clean(input.tone),
    goals: clean(input.goals),
    updatedAt: Date.now(),
  };
}

export function isBrandConfigured(brand: BrandProfile | null | undefined): boolean {
  return Boolean(brand && brand.name.trim());
}

export function loadCachedBrand(userId: string): BrandProfile | null {
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    return raw ? { ...EMPTY_BRAND, ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
}

export async function loadBrand(userId: string): Promise<BrandProfile | null> {
  const cached = loadCachedBrand(userId);
  try {
    const snap = await getDoc(doc(db, 'brands', userId));
    if (snap.exists()) {
      const remote = { ...EMPTY_BRAND, ...(snap.data() as Partial<BrandProfile>) };
      localStorage.setItem(cacheKey(userId), JSON.stringify(remote));
      return remote;
    }
  } catch (e) {
    console.warn('No se pudo leer la marca desde Firestore:', e);
  }
  return cached;
}

// Guarda local siempre; devuelve false si no se pudo sincronizar con Firestore.
export async function saveBrand(userId: string, brand: BrandProfile): Promise<boolean> {
  localStorage.setItem(cacheKey(userId), JSON.stringify(brand));
  try {
    await setDoc(doc(db, 'brands', userId), brand);
    return true;
  } catch (e) {
    console.warn('No se pudo guardar la marca en Firestore:', e);
    return false;
  }
}
