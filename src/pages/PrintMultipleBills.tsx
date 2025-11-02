import { useEffect, useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Bill {
  id: string;
  bill_date: string;
  type: string;
  customer: string;
  bill_no: string;
  total: number;
  processing_price_kg?: number;
  paper_cost?: number;
  basket_quantity?: number;
  customer_note?: string;
  phone?: string;
}

interface BillItem {
  name: string;
  qty: number;
  weight: number;
  fraction: number;
  price: number;
}

const nf = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PrintMultipleBills() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [bills, setBills] = useState<Bill[]>([]);
  const [billsWithItems, setBillsWithItems] = useState<Map<string, BillItem[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    const load = async () => {
      try {
        if (!fromDate || !toDate) {
          setError("ไม่พบข้อมูลวันที่");
          setLoading(false);
          return;
        }

        const { data: billsData, error: billsError } = await supabase
          .from("bills")
          .select("*")
          .gte("bill_date", fromDate)
          .lte("bill_date", toDate)
          .order("bill_date", { ascending: true });

        if (billsError) throw billsError;
        if (!billsData || billsData.length === 0) {
          setError("ไม่พบบิลในช่วงเวลาที่เลือก");
          setLoading(false);
          return;
        }

        setBills(billsData);

        // Fetch items for all bills
        const itemsMap = new Map<string, BillItem[]>();
        for (const bill of billsData) {
          const { data: items, error: itemsError } = await supabase
            .from("bill_items")
            .select("name, qty, weight, fraction, price")
            .eq("bill_id", bill.id)
            .order("created_at", { ascending: true });

          if (itemsError) throw itemsError;
          itemsMap.set(bill.id, items?.map((i: any) => ({
            name: i.name,
            qty: Number(i.qty ?? 0),
            weight: Number(i.weight ?? 0),
            fraction: Number(i.fraction ?? 0),
            price: Number(i.price ?? 0),
          })) || []);
        }

        setBillsWithItems(itemsMap);
      } catch (e: any) {
        setError(e?.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [fromDate, toDate]);

  useEffect(() => {
    if (!loading && bills.length > 0) {
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [loading, bills.length]);

  if (loading) {
    return <div style={{ padding: 24 }}>กำลังเตรียมหน้าพิมพ์...</div>;
  }
  if (error) {
    return <div style={{ padding: 24, color: 'red' }}>{error}</div>;
  }

  return (
    <div className="animate-fade-in">
      <Helmet>
        <title>พิมพ์บิลหลายใบ | A5 แนวนอน</title>
        <meta name="description" content="หน้าพิมพ์บิลหลายใบ ขนาด A5" />
      </Helmet>

      <div className="flex justify-center print:hidden mb-4 gap-2">
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          พิมพ์บิลทั้งหมด ({bills.length} ใบ)
        </Button>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          กลับ
        </Button>
      </div>

      <style>{`
        @page { size: A5; margin: 0mm; }
        :root { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        html, body { background: #f4f4f4; margin: 0; padding: 0; }
        .bill-page {
          background: white; color: #111;
          margin: 0 auto 10mm; box-sizing: border-box; padding: 4mm; position: relative;
          border: 1px solid #222; display: flex; flex-direction: column;
          page-break-after: always;
        }
        .bill-page.portrait {
          width: 148mm; height: 210mm; padding: 3mm;
        }
        .bill-page.landscape {
          width: 210mm; height: 148mm; padding: 4mm;
        }
        @media print {
          .bill-page {
            margin: 0;
            border: none;
          }
          .bill-page:last-child {
            page-break-after: auto;
          }
        }
        .header { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-bottom: 6mm; }
        .hdr-left, .hdr-right { font-size: 12pt; }
        .hdr-right { text-align: right; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #333; text-align: right; }
        th:first-child, td:first-child { text-align: left; }
        .portrait table { font-size: 9pt; }
        .portrait th, .portrait td { padding: 2px 4px; }
        .landscape table { font-size: 11pt; }
        .landscape th, .landscape td { padding: 4px 6px; }
        .foot { display: grid; grid-template-columns: 1fr 1fr; align-items: end; }
        .portrait .foot { margin-top: 8mm; }
        .landscape .foot { margin-top: 4mm; }
        .sign { display:flex; justify-content: space-between; }
        .portrait .sign { padding: 0 6mm; }
        .landscape .sign { padding: 0 10mm; }
        .sign .line { width: 40%; border-top: 1px solid #000; text-align: center; padding-top: 2mm; }
        .total-box { justify-self: end; border: 1px solid #000; font-weight: 700; }
        .portrait .total-box { padding: 3mm 5mm; font-size: 11pt; }
        .landscape .total-box { padding: 5mm 8mm; font-size: 14pt; }
        .brand-row { display: flex; align-items: center; }
        .portrait .brand-row { gap: 3mm; margin-bottom: 2mm; }
        .landscape .brand-row { gap: 6mm; margin-bottom: 4mm; }
        .brand-logo {
          font-weight: 900; letter-spacing: 0.5px;
          background: linear-gradient(90deg, #7c3aed, #2563eb, #06b6d4);
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }
        .portrait .brand-logo { font-size: 14pt; }
        .landscape .brand-logo { font-size: 18pt; }
        .company-name { font-weight: 800; color: #111; }
        .portrait .company-name { font-size: 10pt; }
        .landscape .company-name { font-size: 14pt; }
        .brand-info { display: flex; flex-direction: column; gap: 1mm; }
        .brand-sub { color: #111; line-height: 1.3; }
        .portrait .brand-sub { font-size: 7pt; }
        .landscape .brand-sub { font-size: 9pt; }
        .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid #000; }
        .portrait .info-grid { gap: 2mm; padding: 2mm; margin: 2mm 0 2mm; }
        .landscape .info-grid { gap: 3mm; padding: 3mm; margin: 3mm 0 4mm; }
        .info-item { text-align: left; }
        .info-label { opacity: .9; }
        .portrait .info-label { font-size: 7pt; }
        .landscape .info-label { font-size: 9pt; }
        .info-value { font-weight: 700; }
        .portrait .info-value { font-size: 9pt; }
        .landscape .info-value { font-size: 12pt; }
        .expense-section { padding: 3mm; border: 1px solid #333; }
        .portrait .expense-section { margin-top: 2mm; font-size: 9pt; }
        .landscape .expense-section { margin-top: 4mm; font-size: 11pt; }
        .expense-title { font-weight: 700; }
        .portrait .expense-title { margin-bottom: 1mm; }
        .landscape .expense-title { margin-bottom: 2mm; }
        .expense-grid { display: grid; grid-template-columns: 1fr auto; }
        .portrait .expense-grid { gap: 1mm; }
        .landscape .expense-grid { gap: 2mm; }
        .expense-total { border-top: 2px solid #333; font-weight: 700; }
        .portrait .expense-total { padding-top: 1mm; margin-top: 1mm; font-size: 10pt; }
        .landscape .expense-total { padding-top: 2mm; margin-top: 2mm; font-size: 12pt; }
      `}</style>

      {bills.map((bill) => {
        const items = billsWithItems.get(bill.id) || [];
        const isOrangeBill = bill.type === "sell" && (bill.processing_price_kg || bill.paper_cost || bill.basket_quantity);
        const orientation = isOrangeBill ? "portrait" : "landscape";
        
        const totalWeight = items.reduce((sum, it) => {
          return sum + (Number(it.qty) * Number(it.weight) + Number(it.fraction));
        }, 0);
        
        const overallTotal = items.reduce((sum, it) => {
          const tw = Number(it.qty) * Number(it.weight) + Number(it.fraction);
          return sum + (Number(it.price) * tw);
        }, 0);

        const processingCost = isOrangeBill ? (totalWeight * (Number(bill.processing_price_kg) || 0)) : 0;
        const paperCost = isOrangeBill ? (Number(bill.paper_cost) || 0) : 0;
        const basketQuantity = isOrangeBill ? (Number(bill.basket_quantity) || 0) : 0;
        const finalTotal = isOrangeBill ? (overallTotal + processingCost + paperCost) : overallTotal;

        const dateStr = new Date(bill.bill_date).toLocaleDateString("th-TH");
        const typeLabel = bill.type === "buy" ? "ซื้อ" : "ขาย";

        return (
          <div key={bill.id} className={`bill-page ${orientation}`}>
            <div className="brand-row">
              <div className="brand-logo">TSF</div>
              <div className="brand-info">
                <div className="company-name">บริษัทสะกาจบูรณ์ผลผลิตพริก จำกัด</div>
                <div className="brand-sub">ที่อยู่ 60/7 หมู่ 3 ตำบล บางเจ้า ตำบล พระพรหม จังวัด นครพรหม 80000<br />เลขประจำตัวผู้เสียภาษี 0805568000436</div>
              </div>
            </div>

            <div className="info-grid">
              <div className="info-item">
                <div className="info-label">วันที่</div>
                <div className="info-value">{dateStr}</div>
              </div>
              <div className="info-item">
                <div className="info-label">ประเภทบิล</div>
                <div className="info-value">{typeLabel}</div>
              </div>
              {isOrangeBill ? (
                <>
                  <div className="info-item">
                    <div className="info-label">เลขที่บิล</div>
                    <div className="info-value">{bill.bill_no}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">ชื่อลูกค้า</div>
                    <div className="info-value">{bill.customer}</div>
                  </div>
                  {bill.phone && (
                    <div className="info-item" style={{ gridColumn: 'span 2' }}>
                      <div className="info-label">เบอร์โทร</div>
                      <div className="info-value">{bill.phone}</div>
                    </div>
                  )}
                  {bill.customer_note && (
                    <div className="info-item" style={{ gridColumn: 'span 2' }}>
                      <div className="info-label">หมายเหตุ</div>
                      <div className="info-value">{bill.customer_note}</div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="info-item">
                    <div className="info-label">ชื่อลูกค้า</div>
                    <div className="info-value">{bill.customer}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">เลขที่บิล</div>
                    <div className="info-value">{bill.bill_no}</div>
                  </div>
                </>
              )}
            </div>

            <table>
              <thead>
                <tr>
                  <th>สินค้า</th>
                  <th>จำนวน</th>
                  <th>น้ำหนักต่อหน่วย (กก.)</th>
                  <th>เศษ (กก.)</th>
                  <th>น้ำหนักรวม (กก.)</th>
                  <th>ราคา</th>
                  <th>ราคารวม</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const tw = Number(item.qty) * Number(item.weight) + Number(item.fraction);
                  const lineTotal = Number(item.price) * tw;
                  return (
                    <tr key={idx}>
                      <td style={{ textAlign: 'left' }}>{item.name}</td>
                      <td>{nf.format(item.qty)}</td>
                      <td>{nf.format(item.weight)}</td>
                      <td>{nf.format(item.fraction)}</td>
                      <td>{nf.format(tw)}</td>
                      <td>{nf.format(item.price)}</td>
                      <td>{nf.format(lineTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {isOrangeBill && (
              <div className="expense-section">
                <div className="expense-title">ค่าใช้จ่ายเพิ่มเติม</div>
                <div className="expense-grid">
                  <div>ค่าแรงจัดการ (น้ำหนัก {nf.format(totalWeight)} กก. × {nf.format(Number(bill.processing_price_kg) || 0)} บาท/กก.)</div>
                  <div>{nf.format(processingCost)} บาท</div>
                  <div>ค่ากระดาษและถุง</div>
                  <div>{nf.format(paperCost)} บาท</div>
                  <div>ตะกร้า ({basketQuantity} ใบ)</div>
                  <div>-</div>
                  <div className="expense-total">รวมค่าใช้จ่ายเพิ่มเติม</div>
                  <div className="expense-total">{nf.format(processingCost + paperCost)} บาท</div>
                </div>
              </div>
            )}

            <div className="foot">
              <div className="sign">
                <div className="line">ผู้รับเงิน</div>
                <div className="line">ผู้จ่ายเงิน</div>
              </div>
              <div className="total-box">
                ราคารวม: {nf.format(finalTotal)} บาท
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
