"use client"

import { motion } from "framer-motion"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

interface ReceiptProps {
  order: {
    id: string
    service_name: string
    price: number
    customer_name: string | null
    pickup_date: string
    address: string
    status: string
    created_at: string
  }
}

export default function Receipt({ order }: ReceiptProps) {
  const transactionId = order.id.slice(0, 8).toUpperCase()
  const dateStr = new Date(order.created_at).toLocaleDateString('en-IN', {
    dateStyle: 'long'
  })

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF()
      
      // Header Branding
      doc.setFillColor(7, 7, 26) // Deep Blue
      doc.rect(0, 0, 210, 40, 'F')
      
      doc.setTextColor(245, 200, 66) // Gold
      doc.setFontSize(28)
      doc.setFont("helvetica", "bold")
      doc.text("FreshPress", 105, 20, { align: "center" })
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.text("PREMIUM LAUNDRY & DRY CLEANING", 105, 30, { align: "center" })

      // Order Info
      doc.setTextColor(100, 116, 139)
      doc.setFontSize(10)
      doc.text("INVOICE TO:", 20, 55)
      
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text(order.customer_name || "Valued Customer", 20, 62)
      
      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      doc.text(order.address || "No address provided", 20, 68, { maxWidth: 80 })

      // Details Block
      doc.setTextColor(100, 116, 139)
      doc.text("INVOICE NO:", 140, 55)
      doc.text("DATE:", 140, 62)
      doc.text("STATUS:", 140, 69)

      doc.setTextColor(0, 0, 0)
      doc.setFont("helvetica", "bold")
      doc.text(`#FP-${transactionId}`, 170, 55)
      doc.text(dateStr, 170, 62)
      doc.text(order.status.toUpperCase(), 170, 69)

      // Items Table
      autoTable(doc, {
        startY: 85,
        head: [['Description', 'Category', 'Amount']],
        body: [
          [`${order.service_name} Service`, 'Laundry', `Rs. ${order.price.toFixed(2)}`],
          ['Pickup & Delivery', 'Logistics', 'INCLUDED'],
        ],
        headStyles: { fillColor: [7, 7, 26], textColor: [245, 200, 66] },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { left: 20, right: 20 }
      })

      // Totals
      const finalY = (doc as any).lastAutoTable.finalY + 10
      doc.setFontSize(14)
      doc.text("TOTAL PAID:", 135, finalY + 10)
      doc.setTextColor(16, 185, 129) // Green
      doc.text(`Rs. ${order.price.toFixed(2)}`, 170, finalY + 10)

      // Brand Stamp
      doc.setDrawColor(245, 200, 66)
      doc.setLineWidth(0.5)
      doc.circle(40, finalY + 20, 15)
      doc.setFontSize(8)
      doc.setTextColor(7, 7, 26)
      doc.text("VERIFIED", 32, finalY + 20)
      doc.text("PAYMENT", 32, finalY + 24)

      // Footer
      doc.setTextColor(148, 163, 184)
      doc.setFontSize(9)
      doc.text("Thank you for choosing FreshPress for your laundry needs.", 105, 280, { align: "center" })
      doc.text("This is an electronically generated document.", 105, 285, { align: "center" })

      doc.save(`FreshPress_Invoice_${transactionId}.pdf`)
    } catch (err) {
      console.error("PDF generation failed:", err)
    }
  }

  return (
    <div className="receipt-container glass" style={{
      background: 'white',
      color: '#07071a',
      padding: '40px',
      borderRadius: '8px',
      maxWidth: '500px',
      margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      boxShadow: '0 20px 50px rgba(0,0,0,0.1)'
    }}>
      {/* Receipt Header */}
      <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px dashed #e2e8f0', paddingBottom: '20px' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f5c842', marginBottom: '4px' }}>FreshPress</div>
        <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Official Receipt</div>
      </div>

      {/* Order Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '0.9rem' }}>
        <div>
          <div style={{ color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase' }}>Receipt No.</div>
          <div style={{ fontWeight: 700 }}>#FP-{transactionId}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase' }}>Date</div>
          <div style={{ fontWeight: 700 }}>{dateStr}</div>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <div style={{ color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '4px' }}>Customer</div>
        <div style={{ fontWeight: 700 }}>{order.customer_name || 'Guest User'}</div>
        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{order.address}</div>
      </div>

      {/* Items Section */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9', marginBottom: '10px', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>
          <span>Description</span>
          <span>Amount</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
          <span>{order.service_name} Service</span>
          <span>₹{order.price.toFixed(2)}</span>
        </div>
        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>Premium laundry care & door delivery</div>
      </div>

      {/* Totals */}
      <div style={{ borderTop: '2px solid #07071a', paddingTop: '15px', marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 900 }}>
          <span>Total Paid</span>
          <span style={{ color: '#10b981' }}>₹{order.price.toFixed(2)}</span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '40px', textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
        <p>Thank you for choosing FreshPress!</p>
        <p>This is a computer-generated receipt.</p>
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
          <button 
            onClick={() => window.print()} 
            className="no-print btn-ghost"
            style={{ 
              padding: '8px 16px', 
              borderRadius: '8px', 
              cursor: 'pointer',
              fontSize: '0.8rem',
              color: '#07071a',
              borderColor: '#e2e8f0'
            }}
          >
            🖨️ Print
          </button>
          <button 
            onClick={handleDownloadPDF} 
            className="no-print"
            style={{ 
              background: '#07071a', 
              color: 'white', 
              border: 'none', 
              padding: '8px 16px', 
              borderRadius: '8px', 
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600
            }}
          >
            📥 Download PDF
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          .receipt-container, .receipt-container * { visibility: visible; }
          .receipt-container { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; }
        }
      `}} />
    </div>
  )
}
