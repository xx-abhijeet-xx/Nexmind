const pdfParse = require('pdf-extraction');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');

/**
 * Accepts a PDF file buffer, extracts text, and splits it
 * into overlapping chunks using LangChain's RecursiveCharacterTextSplitter.
 *
 * @param {Buffer} fileBuffer - The raw PDF buffer (from multer memoryStorage)
 * @returns {Promise<{ text: string, chunks: string[], pageCount: number }>}
 */
async function processDocument(fileBuffer) {
  // 1. Extract raw text from the PDF buffer
  const pdfData = await pdfParse(fileBuffer);

  if (!pdfData.text || !pdfData.text.trim()) {
    throw new Error('PDF contains no extractable text');
  }

  // 2. Split using RecursiveCharacterTextSplitter
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const docs = await splitter.createDocuments([pdfData.text]);
  const chunks = docs.map((doc) => doc.pageContent);

  return {
    text: pdfData.text,
    chunks,
    pageCount: pdfData.numpages || 0,
  };
}

module.exports = { processDocument };
