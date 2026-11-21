import path from 'node:path'

export interface DocumentExtractionResult {
  text: string
  pageCount?: number
  status: 'COMPLETED' | 'UNSUPPORTED' | 'FAILED' | 'EMPTY'
  message?: string
}

export async function extractTextFromBuffer(
  buffer: Buffer,
  filename: string,
  _declaredMimeType?: string
): Promise<DocumentExtractionResult> {
  if (!buffer || buffer.length === 0) {
    return {
      text: '',
      status: 'EMPTY',
      message: 'The file buffer is empty (0 bytes).',
    }
  }

  const ext = path.extname(filename).toLowerCase()

  try {
    switch (ext) {
      case '.txt': {
        const text = buffer.toString('utf-8').trim()
        if (!text) {
          return { text: '', status: 'EMPTY', message: 'Plain text file contains no text.' }
        }
        return { text, status: 'COMPLETED' }
      }

      case '.docx': {
        try {
          // Dynamic import of mammoth to keep module lightweight
          const mammoth = await import('mammoth')
          const result = await mammoth.extractRawText({ buffer })
          const text = (result.value || '').trim()
          if (!text) {
            return {
              text: '',
              status: 'EMPTY',
              message: 'DOCX file contains no extractable text.',
            }
          }
          return { text, status: 'COMPLETED' }
        } catch (docxErr: any) {
          return {
            text: '',
            status: 'FAILED',
            message: `Failed to extract text from DOCX: ${docxErr.message || 'Corrupt or unreadable document.'}`,
          }
        }
      }

      case '.pdf': {
        try {
          // Dynamic import of pdf-parse
          const pdfParseModule = await import('pdf-parse')
          // pdf-parse default export or commonjs export
          const pdfParse = (pdfParseModule as any).default || pdfParseModule
          const data = await pdfParse(buffer)
          const rawText = (data.text || '').replace(/\r\n/g, '\n').trim()

          // Check if PDF is essentially empty (scanned image or empty)
          if (!rawText || rawText.length < 15) {
            return {
              text: '',
              pageCount: data.numpages || 1,
              status: 'EMPTY',
              message: 'This PDF appears to be a scanned document or has no selectable text layer. Text extraction cannot proceed without OCR.',
            }
          }

          return {
            text: rawText,
            pageCount: data.numpages,
            status: 'COMPLETED',
          }
        } catch (pdfErr: any) {
          return {
            text: '',
            status: 'FAILED',
            message: `Failed to parse PDF document: ${pdfErr.message || 'Corrupt or encrypted PDF.'}`,
          }
        }
      }

      default:
        return {
          text: '',
          status: 'UNSUPPORTED',
          message: `Text extraction is not supported for ${ext || 'this format'}. Supported formats are .pdf, .docx, and .txt.`,
        }
    }
  } catch (err: any) {
    return {
      text: '',
      status: 'FAILED',
      message: `Extraction encountered an error: ${err.message || 'Unknown error'}`,
    }
  }
}

