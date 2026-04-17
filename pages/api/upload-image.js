// pages/api/upload-image.js
// API intermedia para subir imágenes a Tiendanube sin problemas de OAuth

export default async function handler(req, res) {
    if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Only POST method allowed' });
    }

  const { productSku, maxAttempts = 5 } = req.body;

  if (!productSku) {
        return res.status(400).json({ 
                                          error: 'productSku is required',
                usage: { productSku: 'string', maxAttempts: 'number (optional)' }
        });
  }

  const ACCESS_TOKEN = process.env.TIENDANUBE_ACCESS_TOKEN;
    if (!ACCESS_TOKEN) {
          return res.status(500).json({ error: 'TIENDANUBE_ACCESS_TOKEN not configured' });
    }

  const startTime = Date.now();

  try {
        // 1. Buscar productos en Tiendanube por SKU
      console.log(`🔍 Buscando producto con SKU: ${productSku}`);

      const searchUrl = `https://api.tiendanube.com/v1/7516530/products?q=${productSku}&per_page=50`;
        const searchResponse = await fetch(searchUrl, {
                headers: {
                          'Authentication': `bearer ${ACCESS_TOKEN}`,
                          'Content-Type': 'application/json',
                          'User-Agent': 'TiendanubeImageMigrator/1.0'
                }
        });

      if (!searchResponse.ok) {
              throw new Error(`Error searching products: ${searchResponse.status}`);
      }

      const products = await searchResponse.json();
        const product = products.find(p => 
                                            p.variants.some(v => v.sku === productSku)
                                          );

      if (!product) {
              return res.status(404).json({
                        success: false,
                        error: `Producto con SKU '${productSku}' no encontrado`,
                        searched: products.length
              });
      }

      // 2. Construir URL de imagen desde AnimateMendoza
      const imageUrl = `https://d2r9epyceweg5n.cloudfront.net/stores/001/545/351/products/${productSku}-1.jpg`;

      console.log(`📸 Descargando imagen: ${imageUrl}`);

      // 3. Descargar imagen
      const imageResponse = await fetch(imageUrl, {
              headers: {
                        'User-Agent': 'TiendanubeImageMigrator/1.0'
              }
      });

      if (!imageResponse.ok) {
              return res.status(404).json({
                        success: false,
                        error: `Imagen no encontrada: ${imageUrl}`,
                        productId: product.id,
                        sku: productSku
              });
      }

      const imageBuffer = await imageResponse.arrayBuffer();
        const imageSizeKB = Math.round(imageBuffer.byteLength / 1024);

      console.log(`✅ Imagen descargada: ${imageSizeKB} KB`);

      // 4. Subir imagen a Tiendanube
      const uploadUrl = `https://api.tiendanube.com/v1/7516530/products/${product.id}/images`;

      const formData = new FormData();
        formData.append('src', new Blob([imageBuffer], { type: 'image/jpeg' }), `${productSku}.jpg`);
        formData.append('position', '1');

      const uploadResponse = await fetch(uploadUrl, {
              method: 'POST',
              headers: {
                        'Authentication': `bearer ${ACCESS_TOKEN}`,
                        'User-Agent': 'TiendanubeImageMigrator/1.0'
              },
              body: formData
      });

      if (!uploadResponse.ok) {
              const errorText = await uploadResponse.text();
              throw new Error(`Error uploading image: ${uploadResponse.status} - ${errorText}`);
      }

      const uploadResult = await uploadResponse.json();
        const duration = `${Date.now() - startTime}ms`;

      console.log(`🎉 ¡Imagen subida exitosamente! ID: ${uploadResult.id}`);

      return res.status(200).json({
              success: true,
              data: {
                        sku: productSku,
                        productId: product.id,
                        imageId: uploadResult.id,
                        imageSizeKB,
                        uploadedImageId: uploadResult.id,
                        duration
              }
      });

  } catch (error) {
        const duration = `${Date.now() - startTime}ms`;
        console.error(`❌ Error procesando SKU ${productSku}:`, error.message);

      return res.status(500).json({
              success: false,
              error: error.message,
              sku: productSku,
              duration
      });
  }
}
