import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, sale } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email del cliente es requerido' });
    }

    if (!sale || !sale.items || !sale.items.length) {
      return res.status(400).json({ error: 'Datos de la venta inválidos' });
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || smtpUser;

    const code = sale.id ? sale.id.slice(-6).toUpperCase() : 'POS-' + Math.floor(1000 + Math.random() * 9000);
    const dateStr = sale.date ? `${sale.date} ${sale.hour || ''}` : new Date().toLocaleString('es-CO');

    // ── GENERAR EL HTML DEL RECIBO PREMIUM ──
    const itemsHtml = sale.items.map((item: any, idx: number) => {
      const variantText = item.variantLabel ? ` <span style="font-size: 11px; color: #ff007f; font-weight: bold; text-transform: uppercase;">(${item.variantLabel})</span>` : '';
      
      // Detalles e ingredientes
      const details: string[] = [];
      const flavors = item.flavors || [];
      if (flavors.length > 0) {
        const names = flavors.map((f: any) => typeof f === 'object' ? f.name || f.label : f).join(', ');
        details.push(`🍦 Sabores: ${names}`);
      }
      const fruits = item.fruitChoices || [];
      if (fruits.length > 0) {
        const names = fruits.map((f: any) => typeof f === 'object' ? f.name || f.label : f).join(', ');
        details.push(`🍓 Frutas: ${names}`);
      }
      const sauces = item.includedSauces || [];
      if (sauces.length > 0) {
        details.push(`🍯 Salsas: ${sauces.join(', ')}`);
      }
      if (item.baseChoice) {
        details.push(`🍪 Base: ${item.baseChoice}`);
      }
      if (item.customSelections) {
        Object.entries(item.customSelections).forEach(([key, val]) => {
          details.push(`✨ ${key}: ${val}`);
        });
      }
      
      const additionsList: string[] = [];
      if (item.extraFrutas && item.extraFrutas.length > 0) {
        additionsList.push(`Fruta [${item.extraFrutas.join(', ')}]`);
      }
      if (item.extraFlavors && item.extraFlavors.length > 0) {
        additionsList.push(`Helado [${item.extraFlavors.join(', ')}]`);
      }
      if (item.extraSauces && item.extraSauces.length > 0) {
        additionsList.push(`Salsa [${item.extraSauces.join(', ')}]`);
      }
      const otherAdds = (item.additions || []).filter((a: string) => 
        !a.toLowerCase().includes('adición fruta') && 
        !a.toLowerCase().includes('adición helado') &&
        !a.toLowerCase().includes('adición salsa') &&
        !sauces.includes(a) &&
        !(item.extraSauces || []).includes(a)
      );
      if (otherAdds.length > 0) additionsList.push(...otherAdds);
      if (additionsList.length > 0) {
        details.push(`➕ Adiciones: ${additionsList.join(', ')}`);
      }
      if (item.notes) {
        details.push(`📝 Nota: ${item.notes}`);
      }

      const detailsHtml = details.length > 0 
        ? `<div style="margin-top: 5px; font-size: 11px; color: #666; line-height: 1.4; padding-left: 10px; border-left: 2px solid #ffccd5;">` + 
          details.map(d => `<div style="margin-bottom: 2px;">${d}</div>`).join('') + 
          `</div>` 
        : '';

      return `
        <tr style="border-bottom: 1px solid #f0f0f0;">
          <td style="padding: 15px 0; vertical-align: top;">
            <div style="font-weight: bold; color: #1a1a1a; font-size: 14px;">${idx + 1}. ${item.quantity}x ${item.productName}${variantText}</div>
            ${detailsHtml}
          </td>
          <td style="padding: 15px 0; text-align: right; vertical-align: top; font-weight: bold; color: #1a1a1a; font-size: 14px;">
            $${item.subtotal.toLocaleString('es-CO')}
          </td>
        </tr>
      `;
    }).join('');

    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recibo de Pago - Heladería D'LI</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f7f9fc; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f7f9fc; padding: 40px 0;">
          <tr>
            <td align="center">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-w: 600px; background-color: #ffffff; border-radius: 30px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); margin: 0 auto;">
                
                <!-- HEADER PREMIUM -->
                <tr>
                  <td align="center" style="background: linear-gradient(135deg, #ff007f 0%, #ff52a2 100%); padding: 40px 20px; text-align: center;">
                    <div style="font-size: 32px; font-weight: 900; color: #ffffff; letter-spacing: -1px; margin-bottom: 5px;">D'LI</div>
                    <div style="font-size: 10px; font-weight: 900; color: rgba(255,255,255,0.85); text-transform: uppercase; letter-spacing: 4px; margin-bottom: 20px;">Lugar Favorito</div>
                    <div style="background-color: rgba(255,255,255,0.2); display: inline-block; padding: 6px 16px; border-radius: 50px; color: #ffffff; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; backdrop-filter: blur(5px);">
                      Recibo de Pago Digital
                    </div>
                  </td>
                </tr>

                <!-- CONTENIDO -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td>
                          <h2 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 20px; font-weight: bold;">¡Muchas gracias por tu compra! ❤️</h2>
                          <p style="margin: 0 0 25px 0; color: #666; font-size: 14px; line-height: 1.5;">Hemos procesado tu pago con éxito. A continuación encontrarás el detalle de tu recibo:</p>
                        </td>
                      </tr>
                      
                      <!-- INFORMACIÓN DE VENTA -->
                      <tr>
                        <td>
                          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 20px; padding: 20px; margin-bottom: 30px; font-size: 13px; color: #334155;">
                            <tr>
                              <td style="padding-bottom: 10px; font-weight: bold; width: 40%;">Número de Recibo:</td>
                              <td style="padding-bottom: 10px; text-align: right; color: #0f172a; font-weight: 900;">#${code}</td>
                            </tr>
                            <tr>
                              <td style="padding-bottom: 10px; font-weight: bold;">Fecha y Hora:</td>
                              <td style="padding-bottom: 10px; text-align: right; color: #0f172a; font-weight: bold;">${dateStr}</td>
                            </tr>
                            ${sale.clienteName ? `
                            <tr>
                              <td style="padding-bottom: 10px; font-weight: bold;">Cliente:</td>
                              <td style="padding-bottom: 10px; text-align: right; color: #0f172a; font-weight: bold;">${sale.clienteName}</td>
                            </tr>` : ''}
                            ${sale.tableName ? `
                            <tr>
                              <td style="padding-bottom: 10px; font-weight: bold;">Ubicación/Mesa:</td>
                              <td style="padding-bottom: 10px; text-align: right; color: #0f172a; font-weight: bold;">${sale.tableName}</td>
                            </tr>` : ''}
                            <tr>
                              <td style="font-weight: bold;">Método de Pago:</td>
                              <td style="text-align: right; color: #ff007f; font-weight: 900; text-transform: uppercase;">${sale.paymentMethod}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- TABLA DE ARTÍCULOS -->
                      <tr>
                        <td>
                          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                            <thead>
                              <tr style="border-bottom: 2px solid #e2e8f0;">
                                <th align="left" style="padding-bottom: 12px; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #64748b; letter-spacing: 1px;">Producto</th>
                                <th align="right" style="padding-bottom: 12px; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #64748b; letter-spacing: 1px;">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${itemsHtml}
                            </tbody>
                          </table>
                        </td>
                      </tr>

                      <!-- TOTAL -->
                      <tr>
                        <td style="padding-top: 25px;">
                          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 2px dashed #e2e8f0; padding-top: 20px;">
                            <tr>
                              <td style="font-size: 16px; font-weight: bold; color: #1a1a1a;">Total Pagado</td>
                              <td align="right" style="font-size: 24px; font-weight: 900; color: #ff007f;">$${sale.total.toLocaleString('es-CO')}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- NOTA DOMICILIO -->
                      <tr>
                        <td style="padding-top: 30px;" align="center">
                          <div style="background-color: #fff9fa; border: 1px solid #ffe3e6; border-radius: 15px; padding: 12px 18px; color: #e11d48; font-size: 11px; font-weight: bold; line-height: 1.4; display: inline-block;">
                            🛵 Domicilio: El valor del servicio de envío a domicilio no está incluido y se cancela por separado al repartidor.
                          </div>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>

                <!-- FOOTER -->
                <tr>
                  <td align="center" style="background-color: #f8fafc; padding: 30px; text-align: center; font-size: 11px; color: #64748b; line-height: 1.6; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 8px 0; font-weight: bold; color: #334155;">🍦 Heladería D'LI - Lugar Favorito 🍦</p>
                    <p style="margin: 0 0 5px 0;">Este es un recibo automático generado por tu compra.</p>
                    <p style="margin: 0;">© 2026 Heladería D'LI PWA. Todos los derechos reservados.</p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // ── CONFIGURACIÓN Y ENVÍO DE EMAIL ──
    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn("⚠️ SMTP no configurado en variables de entorno. Recibo simulado exitosamente.");
      return res.status(200).json({
        success: true,
        simulated: true,
        message: 'Credenciales SMTP ausentes. Venta registrada y correo simulado con éxito.',
        recipient: email,
        receiptCode: code
      });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true para 465, false para otros
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    console.log(`Enviando recibo por correo a ${email} para el recibo #${code}...`);
    
    await transporter.sendMail({
      from: `"Heladería D'LI" <${smtpFrom}>`,
      to: email,
      subject: `🍦 Recibo de tu compra #${code} - Heladería D'LI`,
      html: htmlTemplate
    });

    console.log("¡Correo enviado con éxito!");

    return res.status(200).json({
      success: true,
      simulated: false,
      message: 'Recibo de compra enviado exitosamente al correo del cliente.',
      recipient: email,
      receiptCode: code
    });

  } catch (error: any) {
    console.error('Error al enviar el recibo por correo:', error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor al enviar recibo' });
  }
}
