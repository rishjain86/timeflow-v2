import PDFDocument from 'pdfkit';

/**
 * Service to generate a PDF buffer using PDFKit.
 * @param invoice The database invoice object populated with client details.
 * @returns Promise resolving to a Buffer containing the PDF.
 */
export const generatePdfBuffer = async (invoice: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];

      // Capture PDF stream output into buffers
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // --- Theme Variables ---
      const colorDark = '#1f2937';   // Dark Slate
      const colorGray = '#4b5563';   // Muted Gray
      const colorLight = '#f3f4f6';  // Light background for tables/boxes
      const colorBorder = '#e5e7eb'; // Border lines
      const fontRegular = 'Helvetica';
      const fontBold = 'Helvetica-Bold';

      // ==========================================
      // 1. HEADER SECTION
      // ==========================================
      
      // Invoice Title & Number
      doc.fillColor(colorDark).fontSize(28).font(fontBold).text('INVOICE', 50, 45, { align: 'right' });
      doc.fontSize(10).font(fontRegular).fillColor(colorGray).text(`Invoice Number: ${invoice.invoiceNumber}`, { align: 'right' });
      
      // Company Details (You can make this dynamic later if needed)
      doc.fillColor(colorDark).fontSize(20).font(fontBold).text('TimeFlow ERP', 50, 45);
      doc.fontSize(10).font(fontRegular).fillColor(colorGray)
         .text('123 Business Avenue', 50, 70)
         .text('Tech District, Innovation City', 50, 85)
         .text('billing@timeflowerp.com', 50, 100);

      // Header Divider
      const headerBottomY = 135;
      doc.strokeColor(colorBorder).lineWidth(1).moveTo(50, headerBottomY).lineTo(545, headerBottomY).stroke();

      // ==========================================
      // 2. CLIENT & DATES SECTION
      // ==========================================
      const detailsTopY = 160;

      // Bill To details
      doc.fillColor(colorDark).fontSize(11).font(fontBold).text('Bill To:', 50, detailsTopY);
      doc.fontSize(10).font(fontRegular).fillColor(colorGray);
      doc.text(invoice.client?.name || 'Unknown Client', 50, detailsTopY + 15);
      if (invoice.client?.email) {
        doc.text(invoice.client.email, 50, detailsTopY + 30);
      }

      // Dates Info Box
      doc.fillColor(colorDark).fontSize(10).font(fontBold).text('Issue Date:', 350, detailsTopY);
      doc.font(fontRegular).fillColor(colorGray).text(new Date(invoice.issueDate).toLocaleDateString(), 420, detailsTopY);

      if (invoice.dueDate) {
        doc.fillColor(colorDark).font(fontBold).text('Due Date:', 350, detailsTopY + 20);
        doc.font(fontRegular).fillColor(colorGray).text(new Date(invoice.dueDate).toLocaleDateString(), 420, detailsTopY + 20);
      }

      // ==========================================
      // 3. ITEMS TABLE
      // ==========================================
      const tableTopY = 240;
      
      // Table Header Background
      doc.fillColor(colorLight).rect(50, tableTopY, 495, 25).fill();
      
      // Table Header Text
      doc.fillColor(colorDark).fontSize(10).font(fontBold);
      doc.text('Description', 60, tableTopY + 8);
      doc.text('Quantity', 280, tableTopY + 8, { width: 70, align: 'right' });
      doc.text('Unit Price', 360, tableTopY + 8, { width: 80, align: 'right' });
      doc.text('Total', 450, tableTopY + 8, { width: 85, align: 'right' });

      // Table Header Bottom Border
      doc.strokeColor(colorBorder).lineWidth(1).moveTo(50, tableTopY + 25).lineTo(545, tableTopY + 25).stroke();

      // Determine items (Handles missing DB items gracefully)
      const items = invoice.items && invoice.items.length > 0 
        ? invoice.items 
        : [{ description: 'Custom Service / Project Billing', quantity: 1, unitPrice: invoice.subtotal }];

      let currentY = tableTopY + 35;
      doc.font(fontRegular).fillColor(colorGray);

      items.forEach((item: any) => {
        const qty = item.quantity || 1;
        const price = item.unitPrice || invoice.subtotal || 0;
        const total = qty * price;

        doc.text(item.description || 'Service Provision', 60, currentY, { width: 210 });
        doc.text(qty.toString(), 280, currentY, { width: 70, align: 'right' });
        doc.text(`$${price.toFixed(2)}`, 360, currentY, { width: 80, align: 'right' });
        doc.text(`$${total.toFixed(2)}`, 450, currentY, { width: 85, align: 'right' });
        
        // Item Row Divider
        currentY += 20;
        doc.strokeColor('#f9fafb').lineWidth(1).moveTo(50, currentY).lineTo(545, currentY).stroke();
        currentY += 10;
      });

      // ==========================================
      // 4. FINANCIAL SUMMARY
      // ==========================================
      const summaryTopY = currentY + 15;
      const summaryLeftX = 350;

      // Subtotal
      doc.fillColor(colorDark).font(fontBold).text('Subtotal:', summaryLeftX, summaryTopY);
      doc.font(fontRegular).fillColor(colorGray).text(`$${(invoice.subtotal || 0).toFixed(2)}`, 450, summaryTopY, { width: 85, align: 'right' });

      // Tax
      doc.fillColor(colorDark).font(fontBold).text(`Tax (${invoice.taxRate || 0}%):`, summaryLeftX, summaryTopY + 20);
      doc.font(fontRegular).fillColor(colorGray).text(`$${(invoice.taxAmount || 0).toFixed(2)}`, 450, summaryTopY + 20, { width: 85, align: 'right' });

      // Grand Total Highlight Box
      const totalBoxY = summaryTopY + 45;
      doc.fillColor(colorLight).rect(summaryLeftX - 10, totalBoxY - 10, 205, 35).fill();
      
      doc.fillColor(colorDark).fontSize(12).font(fontBold).text('Total Due:', summaryLeftX, totalBoxY);
      doc.fontSize(14).text(`$${(invoice.totalAmount || 0).toFixed(2)}`, 420, totalBoxY - 2, { width: 115, align: 'right' });

      // ==========================================
      // 5. NOTES & FOOTER
      // ==========================================
      if (invoice.notes) {
        doc.fontSize(10).font(fontBold).fillColor(colorDark).text('Notes & Payment Terms:', 50, summaryTopY);
        doc.font(fontRegular).fillColor(colorGray).text(invoice.notes, 50, summaryTopY + 15, { width: 250, lineGap: 4 });
      }

      // Bottom Footer Message
      const pageHeight = doc.page.height;
      doc.fontSize(8).font(fontRegular).fillColor('#9ca3af').text(
        'Thank you for your business. For any questions regarding this invoice, please contact us.',
        50, pageHeight - 50, { align: 'center', width: 495 }
      );

      // Finalize the PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
