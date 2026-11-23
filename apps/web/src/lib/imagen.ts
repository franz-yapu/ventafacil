/**
 * Preparar una foto ANTES de subirla.
 *
 * Es la pieza que resuelve el problema del almacenamiento, y lo resuelve en el sitio
 * correcto: una foto de móvil pesa 3-5 MB, y el mismo producto en 800×800 WebP pesa unos
 * 60 kB. Con 5.000 productos son 300 MB en vez de 20 GB.
 *
 * Hacerlo en el NAVEGADOR y no en el servidor tiene dos ventajas, y la segunda es la que
 * de verdad importa en una tienda:
 *
 * 1. El VPS tiene 1 vCPU para todo el stack. Redimensionar cien fotos ahí es tiempo que la
 *    caja de al lado pasa esperando para cobrar.
 * 2. **Se sube 60 kB en vez de 4 MB.** Por la conexión de una tienda, eso es la diferencia
 *    entre que subir el catálogo tarde un rato y que no termine nunca.
 *
 * NO se recorta: la foto conserva su proporción y sólo se reduce hasta que su lado mayor
 * mide 800 px. Antes se recortaba a un cuadrado central, y un producto largo (un alicate,
 * una escalera) perdía los extremos al subirlo. Es la pantalla que muestra la foto —un
 * cuadro pequeño con `object-contain`— la que se ocupa de encajarla.
 */

/** Lado MAYOR de la foto final. 800 se ve nítido hasta en una tablet buena y pesa poco. */
const LADO = 800;
/** 0.8 en WebP es donde deja de notarse la diferencia y el archivo aún es pequeño. */
const CALIDAD = 0.8;
/** Tope de entrada: por encima de esto no es una foto de producto, es un error. */
export const MAX_ENTRADA_MB = 20;

export interface ImagenLista {
  blob: Blob;
  /** Para enseñarla antes de subir. Hay que revocarla al terminar. */
  url: string;
  bytes: number;
  bytesOriginal: number;
}

export class ErrorDeImagen extends Error {}

/** Escala conservando la proporción (lado mayor = 800, sin ampliar) y devuelve WebP. */
export async function prepararImagen(file: File): Promise<ImagenLista> {
  if (!file.type.startsWith('image/')) {
    throw new ErrorDeImagen('Eso no parece una imagen.');
  }
  if (file.size > MAX_ENTRADA_MB * 1024 * 1024) {
    throw new ErrorDeImagen(`La imagen no puede pasar de ${MAX_ENTRADA_MB} MB.`);
  }

  const bitmap = await cargar(file);
  try {
    // Sin ampliar: una foto de 300 px no gana nada estirada a 800.
    const escala = Math.min(1, LADO / Math.max(bitmap.width, bitmap.height));
    const ancho = Math.max(1, Math.round(bitmap.width * escala));
    const alto = Math.max(1, Math.round(bitmap.height * escala));

    const canvas = document.createElement('canvas');
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new ErrorDeImagen('Este navegador no puede procesar la imagen.');

    /*
      Fondo blanco antes de dibujar.

      Un PNG con transparencia sobre un canvas vacío sale con el fondo NEGRO al pasarlo a
      WebP sin alfa, y en modo claro eso es un cuadro negro en medio de la rejilla. Con el
      blanco debajo se ve como se espera en los dos modos.
    */
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, ancho, alto);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height, 0, 0, ancho, alto);

    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/webp', CALIDAD));
    if (!blob) throw new ErrorDeImagen('No se pudo preparar la imagen.');

    return {
      blob,
      url: URL.createObjectURL(blob),
      bytes: blob.size,
      bytesOriginal: file.size,
    };
  } finally {
    bitmap.close?.();
  }
}

/**
 * `createImageBitmap` con caída a `<img>`.
 *
 * El primero es más rápido y no toca el DOM, pero un WebView viejo —los de las tabletas
 * baratas que es justo donde corre esto— puede no tenerlo. Sin la caída, subir una foto
 * fallaría exactamente en los aparatos donde más se va a usar.
 */
async function cargar(file: File): Promise<ImageBitmap & { close?: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // Sigue por el camino de abajo.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const el = new Image();
      el.onload = () => res(el);
      el.onerror = () => rej(new ErrorDeImagen('No se pudo leer la imagen.'));
      el.src = url;
    });
    return img as unknown as ImageBitmap & { close?: () => void };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** "3,8 MB → 61 kB": lo que convence de que valió la pena esperar dos segundos. */
export function ahorro(i: ImagenLista): string {
  const kb = (n: number) =>
    n < 1024 * 1024 ? `${Math.round(n / 1024)} kB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${kb(i.bytesOriginal)} → ${kb(i.bytes)}`;
}
