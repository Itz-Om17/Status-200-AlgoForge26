import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Captures a React DOM element and exports it as a multi-page PDF.
 * @param {HTMLElement} element - The DOM element to capture (e.g., reportRef.current)
 * @param {string} filename - The name of the downloaded file
 */
export const exportElementToPDF = async (element, filename = 'FairAI_Compliance_Report.pdf') => {
  if (!element) return;

  try {
    const canvas = await html2canvas(element, { 
      scale: 2, 
      useCORS: true,
      backgroundColor: '#111111',
      windowWidth: element.scrollWidth
    });
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
    heightLeft -= pageHeight;
    
    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    pdf.save(filename);
    return true;
  } catch (err) {
    console.error('Error generating PDF:', err);
    throw err;
  }
};
