/**
 * Helper to dynamically load PDF.js from a secure CDN to parse PDFs client-side
 * without heavy bundler worker configurations.
 */
let pdfjsPromise: Promise<any> | null = null;

export async function loadPdfJs(): Promise<any> {
  if ((window as any).pdfjsLib) return (window as any).pdfjsLib;
  if (pdfjsPromise) return pdfjsPromise;

  pdfjsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      // Configure CDN worker path
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(pdfjsLib);
    };
    script.onerror = (err) => {
      pdfjsPromise = null;
      reject(new Error('Failed to load PDF.js parser library. Please check your network.'));
    };
    document.head.appendChild(script);
  });

  return pdfjsPromise;
}

/**
 * Helper to dynamically load mammoth.js from CDN to parse DOCX files client-side.
 */
let mammothPromise: Promise<any> | null = null;

export async function loadMammoth(): Promise<any> {
  if ((window as any).mammoth) return (window as any).mammoth;
  if (mammothPromise) return mammothPromise;

  mammothPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
    script.onload = () => {
      const mammoth = (window as any).mammoth;
      if (mammoth) {
        resolve(mammoth);
      } else {
        mammothPromise = null;
        reject(new Error('mammoth.js loaded but not available on window'));
      }
    };
    script.onerror = () => {
      mammothPromise = null;
      reject(new Error('Failed to load mammoth.js DOCX parser library. Please check your network.'));
    };
    document.head.appendChild(script);
  });

  return mammothPromise;
}

/**
 * Extracts raw text from a PDF file in the browser.
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
    standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/'
  }).promise;
  let text = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str);
    text += strings.join(' ') + '\n';
  }

  return text.trim();
}

/**
 * Extracts raw text from a DOCX file in the browser using mammoth.js.
 */
export async function extractTextFromDocx(file: File): Promise<string> {
  const mammoth = await loadMammoth();
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return (result.value || '').trim();
}

/**
 * Extracts text from plain text files (.txt, .md, .csv, .json, code files, etc.)
 */
export async function extractTextFromPlainFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || '');
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}

/**
 * High-level helper to route text extraction based on file extension / mime-type.
 */
export async function parseDocumentText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  
  if (name.endsWith('.pdf')) {
    return await extractTextFromPdf(file);
  }

  if (name.endsWith('.docx')) {
    return await extractTextFromDocx(file);
  }
  
  // Supported plain text formats
  if (
    file.type.startsWith('text/') ||
    name.endsWith('.txt') ||
    name.endsWith('.md') ||
    name.endsWith('.csv') ||
    name.endsWith('.json') ||
    name.endsWith('.js') ||
    name.endsWith('.jsx') ||
    name.endsWith('.ts') ||
    name.endsWith('.tsx') ||
    name.endsWith('.py') ||
    name.endsWith('.html') ||
    name.endsWith('.css')
  ) {
    return await extractTextFromPlainFile(file);
  }
  
  throw new Error(`Unsupported file type. We currently support PDFs, DOCX, and plain text documents (.txt, .md, .csv, .json, code files).`);
}
