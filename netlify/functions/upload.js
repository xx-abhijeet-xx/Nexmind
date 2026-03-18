const { processDocument } = require('./utils/documentProcessor');

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

exports.handler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    const bodyData = JSON.parse(event.body || "{}");
    const { pdfBase64, fileName } = bodyData;

    if (!pdfBase64) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'No PDF data provided' }) };
    }

    // Convert Base64 string back to a raw byte Buffer for PDF extraction
    const fileBuffer = Buffer.from(pdfBase64, 'base64');
    
    // Ensure the buffer is not excessively large (arbitrary 20MB limit)
    if (fileBuffer.length > 20 * 1024 * 1024) {
      return { statusCode: 413, headers: CORS_HEADERS, body: JSON.stringify({ error: 'PDF file is too large (max 20MB)' }) };
    }

    const { chunks, pageCount } = await processDocument(fileBuffer);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        fileName: fileName || 'uploaded.pdf',
        pageCount,
        chunkCount: chunks.length,
        chunks,
      })
    };
  } catch (err) {
    console.error('PDF upload error:', err.message);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'Failed to process PDF',
        details: err.message,
      }),
    };
  }
};
