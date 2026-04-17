// pages/api/health.js
// Endpoint de verificación para comprobar que la API funciona

export default async function handler(req, res) {
  const timestamp = new Date().toISOString();

  return res.status(200).json({
        status: 'OK',
        message: 'API de migración de imágenes funcionando correctamente',
        timestamp,
        version: '1.0.0',
        endpoints: {
          uploadImage: '/api/upload-image',
                  health: '/api/health'
            },
    usage: {
      uploadImage: {
        method: 'POST',
                  body: {
          productSku: 'string (requerido)',
                      maxAttempts: 'number (opcional, default: 5)'
            },
                    response: {
          success: 'boolean',
                      data: {
            sku: 'string',
                          productId: 'number',
                          imageId: 'string',
                          imageSizeKB: 'number',
                          uploadedImageId: 'number',
                          duration: 'string'
              }
                    }
      }
    }
});
}
