import nodemailer from 'nodemailer';

/**
 * Service to dispatch an email with the invoice attached as a PDF.
 * @param invoice The database invoice object populated with client details.
 * @param pdfBuffer The generated PDF buffer to attach.
 */
export const sendInvoiceEmail = async (invoice: any, pdfBuffer: Buffer): Promise<void> => {
  // Setup NodeMailer Transporter (In production, load these from your env file/config module)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io', // Fallback for testing
    port: Number(process.env.SMTP_PORT) || 2525,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: process.env.MAIL_FROM_ADDRESS || '"TimeFlow ERP Billing" <billing@timeflow.com>',
    to: invoice.client.email,
    subject: `Your Invoice ${invoice.invoiceNumber} from TimeFlow ERP`,
    text: `Dear ${invoice.client.name},\n\nPlease find attached your invoice (${invoice.invoiceNumber}) for the amount of $${invoice.totalAmount.toFixed(2)}.\n\nThank you for your business!`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563EB;">Invoice Generated</h2>
        <p>Dear <strong>${invoice.client.name}</strong>,</p>
        <p>Your latest invoice <strong>${invoice.invoiceNumber}</strong> is ready for your review.</p>
        
        <div style="background-color: #F1F5F9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Total Amount Due:</strong> $${invoice.totalAmount.toFixed(2)}</p>
          <p style="margin: 5px 0 0 0;"><strong>Due Date:</strong> ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Upon receipt'}</p>
        </div>
        
        <p>Please find the detailed PDF attached to this email.</p>
        <br/>
        <p>Best regards,<br/><strong>TimeFlow ERP Team</strong></p>
      </div>
    `,
    attachments: [
      {
        filename: `Invoice_${invoice.invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  };

  // Dispatch the email
  await transporter.sendMail(mailOptions);
};
