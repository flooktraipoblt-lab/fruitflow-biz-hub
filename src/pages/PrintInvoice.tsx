import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate } from "react-router-dom";
import { Printer, Camera, Share } from "lucide-react";
import html2canvas from "html2canvas";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useAuthData } from "@/hooks/useAuthData";
import { format } from "date-fns";

// Minimal, print-optimized page to render an invoice and auto-print (A3 landscape)
interface Invoice {
  id: string;
  date?: string; // fallback fields supported below
  bill_date?: string;
  type?: string;
  customer_name?: string;
  customer?: string;
  receipt_no?: string;
  bill_no?: string;
  company_address?: string;
  tax_id?: string;
  created_at?: string;
}

interface InvoiceItem {
  name: string;
  qty: number; // จำนวนถุง/หน่วย
  weight: number; // น้ำหนักต่อหน่วย (กก.)
  fraction: number; // เศษ (กก.)
  price: number; // ราคา/กก.
}

const nf = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PrintInvoice() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const { session } = useAuthData();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bill, setBill] = useState<any>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleSaveImage = async () => {
    try {
      const billElement = document.querySelector('.bill-content') as HTMLElement;
      if (!billElement) {
        toast({ title: "ไม่พบเนื้อหาบิล", variant: "destructive" });
        return;
      }

      const canvas = await html2canvas(billElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      });

      // Create download link
      const link = document.createElement('a');
      link.download = `bill-${bill?.bill_no || 'unknown'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast({ title: "บันทึกรูปภาพสำเร็จ" });
    } catch (error) {
      console.error('Error saving image:', error);
      toast({ title: "เกิดข้อผิดพลาดในการบันทึกรูป", variant: "destructive" });
    }
  };

  const handleShareToLine = async () => {
    try {
      const billElement = document.querySelector('.bill-content') as HTMLElement;
      if (!billElement) {
        toast({ title: "ไม่พบเนื้อหาบิล", variant: "destructive" });
        return;
      }

      const canvas = await html2canvas(billElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      });

      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (!blob || !bill) return;

        // Save share data to Supabase
        const shareData = {
          bill_id: bill.id,
          bill_no: bill.bill_no,
          customer_name: bill.customer,
          bill_type: bill.type,
          total_amount: bill.total,
          bill_date: bill.bill_date,
          shared_at: new Date().toISOString(),
          owner_id: session?.user.id,
        };

        const { error } = await supabase.from('bill_shares').insert(shareData);
        if (error) {
          console.error('Error saving share data:', error);
        }

        // Create share text
        const shareText = `วันที่ : ${format(new Date(bill.bill_date), "dd/MM/yyyy")}\nชื่อลูกค้า : ${bill.customer}\nประเภทบิล : ${bill.type}\nยอดเงินรวม : ${parseFloat(bill.total).toLocaleString()} บาท\nรูปภาพบิล :`;

        // Create temporary link with image
        const imageUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = `https://line.me/R/msg/text/?${encodeURIComponent(shareText)}`;
        link.target = '_blank';
        link.click();

        toast({ title: "เปิด Line แล้ว กรุณาแนบรูปภาพด้วยตนเอง" });
      }, 'image/png', 1.0);
    } catch (error) {
      console.error('Error sharing to Line:', error);
      toast({ title: "เกิดข้อผิดพลาดในการแชร์", variant: "destructive" });
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        if (!invoiceId) {
          setError("ไม่พบรหัสใบแจ้งหนี้");
          setLoading(false);
          return;
        }
        // Try new invoices tables first; gracefully fallback if not present
        const [{ data: inv, error: invErr }, { data: itms, error: itemsErr }] = await Promise.all([
          (supabase as any)
            .from("invoices")
            .select("*")
            .eq("id", invoiceId)
            .maybeSingle(),
          (supabase as any)
            .from("invoice_items")
            .select("name, qty, weight, fraction, price")
            .eq("invoice_id", invoiceId)
            .order("created_at", { ascending: true }),
        ]);

        // Helper: check if error indicates table missing (older schema)
        const isMissingTable = (err: any, table: string) => {
          if (!err) return false;
          const msg = String(err?.message || "").toLowerCase();
          return msg.includes("could not find the table") || msg.includes("schema cache") || msg.includes(`public.${table}`);
        };

        const fallbackToBills = async () => {
          const [{ data: bill, error: billErr }, { data: billItems, error: biErr }] = await Promise.all([
            (supabase as any)
              .from("bills")
              .select("*")
              .eq("id", invoiceId)
              .maybeSingle(),
            (supabase as any)
              .from("bill_items")
              .select("name, qty, weight, fraction, price")
              .eq("bill_id", invoiceId)
              .order("created_at", { ascending: true }),
          ]);
          if (billErr) throw billErr;
          if (biErr) throw biErr;
          if (!bill) throw new Error("ไม่พบข้อมูลใบแจ้งหนี้");
          setBill(bill); // Store bill data for sharing
          setInvoice({
            id: bill.id,
            bill_date: bill.bill_date,
            type: bill.type,
            customer_name: bill.customer,
            receipt_no: (bill as any).bill_no || bill.id,
            company_address: bill.company_address,
            tax_id: bill.tax_id,
          });
          setItems((billItems ?? []).map((b: any) => ({
            name: b.name,
            qty: Number(b.qty ?? 0),
            weight: Number(b.weight ?? 0),
            fraction: Number(b.fraction ?? 0),
            price: Number(b.price ?? 0),
          })));
        };

        if (isMissingTable(invErr, "invoices") || isMissingTable(itemsErr, "invoice_items")) {
          await fallbackToBills();
        } else if (invErr || itemsErr) {
          throw invErr || itemsErr;
        } else if (!inv) {
          await fallbackToBills();
        } else {
          setInvoice(inv as Invoice);
          setItems((itms ?? []).map((i: any) => ({
            name: i.name,
            qty: Number(i.qty ?? 0),
            weight: Number(i.weight ?? 0),
            fraction: Number(i.fraction ?? 0),
            price: Number(i.price ?? 0),
          })));
        }
      } catch (e: any) {
        setError(e?.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [invoiceId]);

  // สั่งพิมพ์เมื่อโหลดข้อมูลเสร็จ
  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [loading]);

  const DISPLAY_ROWS = 6;
  const isCompact = items.length <= DISPLAY_ROWS;

  const pages = useMemo(() => {
    const chunks: (InvoiceItem | null)[][] = [];
    
    // If no items, don't create any pages
    if (items.length === 0) {
      return chunks;
    }
    
    if (isCompact) {
      // For compact mode, create one page with actual items only
      chunks.push(items.map(i => i as InvoiceItem | null));
      return chunks;
    }
    
    // Create pages only for actual data
    for (let i = 0; i < items.length; i += DISPLAY_ROWS) {
      const slice = items.slice(i, i + DISPLAY_ROWS);
      // Only pad if we have items in this slice
      if (slice.length > 0) {
        const padded = Array.from({ length: DISPLAY_ROWS }, (_, idx) => slice[idx] ?? null);
        chunks.push(padded);
      }
    }
    
    return chunks;
  }, [items, isCompact]);

  const pageTotals = useMemo(() => {
    return pages.map((rows) => {
      const valid = rows.filter((r): r is InvoiceItem => r !== null);
      const lines = valid.map((it) => {
        const totalWeight = Number(it.qty) * Number(it.weight) + Number(it.fraction);
        const lineTotal = Number(it.price) * totalWeight;
        return { totalWeight, lineTotal };
      });
      const grandWeight = lines.reduce((s, l) => s + l.totalWeight, 0);
      const grandTotal = lines.reduce((s, l) => s + l.lineTotal, 0);
      return { lines, grandWeight, grandTotal };
    });
  }, [pages]);

  const overallTotal = useMemo(() => {
    return items.reduce((sum, it) => {
      const totalWeight = Number(it.qty) * Number(it.weight) + Number(it.fraction);
      const lineTotal = Number(it.price) * totalWeight;
      return sum + lineTotal;
    }, 0);
  }, [items]);

  const totalWeight = useMemo(() => {
    return items.reduce((sum, it) => {
      const tw = Number(it.qty) * Number(it.weight) + Number(it.fraction);
      return sum + tw;
    }, 0);
  }, [items]);

  const isOrangeBill = invoice?.type === "sell";
  const processingCost = isOrangeBill && bill ? (totalWeight * (Number(bill.processing_price_kg) || 0)) : 0;
  const paperCost = isOrangeBill && bill ? (Number(bill.paper_cost) || 0) : 0;
  const basketQuantity = isOrangeBill && bill ? (Number(bill.basket_quantity) || 0) : 0;
  const finalTotal = isOrangeBill ? (overallTotal + processingCost + paperCost) : overallTotal;

  const invDate = invoice?.date || invoice?.bill_date || invoice?.created_at;
  const dateStr = invDate ? new Date(invDate).toLocaleDateString("th-TH") : "";
  const invType = invoice?.type === "buy" ? "ซื้อ" : invoice?.type === "sell" ? "ขาย" : (invoice?.type || "");
  const cust = invoice?.customer_name || invoice?.customer || "";
  const receiptNo = invoice?.bill_no || invoice?.receipt_no || invoice?.id || "";
  const addr = invoice?.company_address || "";
  const taxId = invoice?.tax_id || "";

  if (loading) {
    return <div style={{ padding: 24 }}>กำลังเตรียมหน้าพิมพ์...</div>;
  }
  if (error) {
    return <div style={{ padding: 24, color: 'red' }}>{error}</div>;
  }

      return (
    <div className="animate-fade-in">
      <Helmet>
        <title>พิมพ์บิล | A5 แนวนอน</title>
        <meta name="description" content="หน้าพิมพ์บิล ขนาด A5 แนวนอน" />
        <link rel="canonical" href={`${window.location.origin}/print/${invoiceId}`} />
      </Helmet>

      <div className="flex justify-center print:hidden mb-4 gap-2">
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          พิมพ์บิล
        </Button>
        <Button onClick={handleSaveImage} variant="outline">
          <Camera className="mr-2 h-4 w-4" />
          บันทึกรูป
        </Button>
        <Button onClick={handleShareToLine} variant="outline">
          <Share className="mr-2 h-4 w-4" />
          แชร์ไป Line
        </Button>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          กลับ
        </Button>
      </div>

      <style>{`
        @page { size: A5 ${isOrangeBill ? 'portrait' : 'landscape'}; margin: 0mm; }
        :root { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        html, body { background: #f4f4f4; margin: 0; padding: 0; }
        .page {
          width: ${isOrangeBill ? '148mm' : '210mm'}; height: ${isOrangeBill ? '210mm' : '148mm'}; background: white; color: #111;
          margin: 0; box-sizing: border-box; padding: 4mm; position: relative;
          border: 1px solid #222; display: flex; flex-direction: column;
          min-height: ${isOrangeBill ? '210mm' : '148mm'}; max-width: ${isOrangeBill ? '148mm' : '210mm'};
        }
        .header { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-bottom: 6mm; }
        .hdr-left, .hdr-right { font-size: 12pt; }
        .hdr-right { text-align: right; }
        .title-row { display:flex; justify-content: space-between; align-items: center; margin-bottom: 4mm; }
        .title { font-size: 16pt; font-weight: 700; }
        .meta { font-size: 11pt; }
        table { width: 100%; border-collapse: collapse; font-size: 11pt; }
        th, td { border: 1px solid #333; padding: 4px 6px; text-align: right; }
        th:first-child, td:first-child { text-align: left; }
        .foot { display: grid; grid-template-columns: 1fr 1fr; margin-top: 4mm; align-items: end; }
        .sign { display:flex; justify-content: space-between; padding: 0 10mm; }
        .sign .line { width: 40%; border-top: 1px solid #000; text-align: center; padding-top: 2mm; }
        .total-box { justify-self: end; border: 1px solid #000; padding: 5mm 8mm; font-size: 14pt; font-weight: 700; }
        .cont { grid-column: 1 / -1; text-align: center; font-size: 12pt; font-weight: 700; padding: 3mm 0; }
        .muted { opacity: .9; }
        .brand-row { display: flex; align-items: center; gap: 6mm; margin-bottom: 4mm; }
        .brand-logo {
          font-weight: 900; font-size: 18pt; letter-spacing: 0.5px;
          background: linear-gradient(90deg, hsl(var(--brand-1)), hsl(var(--brand-2)), hsl(var(--brand-3)));
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }
        .company-name { font-size: 14pt; font-weight: 800; color: #111; }
        .brand-info { display: flex; flex-direction: column; gap: 1mm; }
        .brand-sub { font-size: 9pt; color: #111; line-height: 1.3; }
        .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; padding: 3mm; border: 1px solid #000; margin: 3mm 0 4mm; }
        .info-item { text-align: left; }
        .info-label { font-size: 9pt; opacity: .9; }
        .info-value { font-size: 12pt; font-weight: 700; }

        /* Compact mode for <= 6 items to ensure everything fits on only page */
        .page.compact { padding: 8mm; }
        .page.compact .brand-row { gap: 3mm; margin-bottom: 2mm; }
        .page.compact .brand-logo { font-size: 25pt; }
        .page.compact .company-name { font-size: 12pt; }
        .page.compact .brand-sub { font-size: 8pt; }
        .page.compact .info-grid { gap: 2mm; padding: 2mm; margin: 2mm 0 3mm; }
        .page.compact .info-label { font-size: 8pt; }
        .page.compact .info-value { font-size: 11pt; }
        .page.compact table { font-size: 10pt; }
        .page.compact th, .page.compact td { padding: 2px 4px; }
        .page.compact .foot { margin-top: 2mm; }
        .page.compact .sign { padding: 0 6mm; }
        .page.compact .sign .line { width: 38%; padding-top: 1.5mm; }
        .page.compact .total-box { padding: 4mm 6mm; font-size: 12pt; }

        @media print {
          html, body { background: white; }
          .page { box-shadow: none; border: none; padding: 8mm; }
          .page.compact { padding: 8mm; }
          .cont { padding: 0; }
        }
      `}</style>

      {pages.map((rows, pageIndex) => (
        <main className={`page ${isCompact ? 'compact' : ''} bill-content`} key={pageIndex}>
          <div className="brand-row">
            <div className="brand-logo">TSF</div>
            <div className="brand-info">
              <div className="company-name">บริษัทตระกาญจน์สยามฟรุ๊ต จำกัด</div>
              <div className="brand-sub">ที่อยู่ 60/7 หมู่ 3 ตำบล นาพรุ อำเภอ พระพรหม จังหวัด นครศรีธรรมราช 80000</div>
              <div className="brand-sub">เลขประจำตัวผู้เสียภาษี 0805568000436</div>
            </div>
          </div>

          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">วันที่</div>
              <div className="info-value">{dateStr || '-'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">ประเภทบิล</div>
              <div className="info-value">{invType || '-'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">ชื่อลูกค้า</div>
              <div className="info-value">{cust || '-'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">เลขที่บิล</div>
              <div className="info-value">{receiptNo || '-'}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style={{width:'30%'}}>สินค้า</th>
                <th>จำนวน</th>
                <th>น้ำหนักต่อหน่วย (กก.)</th>
                <th>เศษ (กก.)</th>
                <th>น้ำหนักรวม (กก.)</th>
                <th>ราคา</th>
                <th>ราคารวม</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((it, idx) => {
                if (!it) {
                  return (
                    <tr key={idx}>
                      <td style={{textAlign:'left'}}>&nbsp;</td>
                      <td>&nbsp;</td>
                      <td>&nbsp;</td>
                      <td>&nbsp;</td>
                      <td>&nbsp;</td>
                      <td>&nbsp;</td>
                      <td>&nbsp;</td>
                    </tr>
                  );
                }
                const totalWeight = Number(it.qty) * Number(it.weight) + Number(it.fraction);
                const lineTotal = Number(it.price) * totalWeight;
                return (
                  <tr key={idx}>
                    <td style={{textAlign:'left'}}>{it.name}</td>
                    <td>{nf.format(Number(it.qty))}</td>
                    <td>{nf.format(Number(it.weight))}</td>
                    <td>{nf.format(Number(it.fraction))}</td>
                    <td>{nf.format(totalWeight)}</td>
                    <td>{nf.format(Number(it.price))}</td>
                    <td>{nf.format(lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {isOrangeBill && pageIndex === pages.length - 1 && (
            <div style={{ marginTop: '4mm', padding: '3mm', border: '1px solid #333', fontSize: '11pt' }}>
              <div style={{ fontWeight: '700', marginBottom: '2mm' }}>ค่าใช้จ่ายและสรุปยอด</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2mm' }}>
                <div>น้ำหนักรวม:</div>
                <div style={{ fontWeight: '700' }}>{nf.format(totalWeight)} กก.</div>
                
                <div>ค่าร่อน ล้าง แว็กซ์ ({nf.format(Number(bill?.processing_price_kg) || 0)} บาท/กก.):</div>
                <div style={{ fontWeight: '700' }}>{nf.format(processingCost)} บาท</div>
                
                <div>ค่ากระดาษ:</div>
                <div style={{ fontWeight: '700' }}>{nf.format(paperCost)} บาท</div>
                
                <div>จำนวนส้มทั้งหมด:</div>
                <div style={{ fontWeight: '700' }}>{basketQuantity} ตะกร้า</div>
                
                <div style={{ borderTop: '2px solid #333', paddingTop: '2mm', marginTop: '2mm', fontWeight: '700', fontSize: '12pt' }}>
                  จำนวนเงินรวมทั้งหมด:
                </div>
                <div style={{ borderTop: '2px solid #333', paddingTop: '2mm', marginTop: '2mm', fontWeight: '700', fontSize: '12pt' }}>
                  {nf.format(finalTotal)} บาท
                </div>
              </div>
            </div>
          )}

          <div className="foot">
            {pageIndex === pages.length - 1 ? (
              <>
                <div className="sign">
                  <div className="line">ผู้รับเงิน</div>
                  <div className="line">ผู้จ่ายเงิน</div>
                </div>
                <div className="total-box">
                  {isOrangeBill ? `ยอดสุทธิ: ${nf.format(finalTotal)} บาท` : `ราคารวม: ${nf.format(overallTotal)} บาท`}
                </div>
              </>
            ) : (
              <div className="cont">มีต่อหน้าที่ {pageIndex + 2}</div>
            )}
          </div>
        </main>
      ))}
    </div>
  );
}