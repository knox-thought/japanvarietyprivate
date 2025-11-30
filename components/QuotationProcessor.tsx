import React, { useState } from 'react';
import { Sparkles, Copy, Check, Calculator, FileText } from './Icons';
import clsx from 'clsx';

interface ProcessedDay {
  date: string;
  vehicle: string;
  serviceType: string;
  route: string;
  costPrice: number;
  costPriceNote?: string;
  sellingPrice: number;
  currency: string;
}

interface ProcessedQuotation {
  customerName: string;
  days: ProcessedDay[];
  totalCost: number;
  totalSelling: number;
  notes: string[];
}

export const QuotationProcessor: React.FC = () => {
  const [input1, setInput1] = useState('');
  const [input2, setInput2] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessedQuotation | null>(null);
  const [copiedOutput, setCopiedOutput] = useState<'cost' | 'selling' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const MARKUP_MULTIPLIER = 1.391; // 30% margin + 7% VAT

  const processQuotation = async () => {
    if (!input1.trim() || !input2.trim()) {
      setError('กรุณากรอกข้อมูลทั้ง 2 ช่อง');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/process-quotation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ourQuotation: input1, 
          operatorResponse: input2,
          markupMultiplier: MARKUP_MULTIPLIER
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process quotation');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPrice = (price: number, currency: string = '¥') => {
    return `${currency}${price.toLocaleString()}`;
  };

  const generateOutputText = (type: 'cost' | 'selling') => {
    if (!result) return '';

    let output = `${result.customerName}\n\n`;

    result.days.forEach(day => {
      const price = type === 'cost' ? day.costPrice : day.sellingPrice;
      output += `${day.date}\n`;
      output += `${day.vehicle}\n`;
      output += `${day.serviceType}\n`;
      output += `${day.route}\n`;
      output += `💰 ${formatPrice(price, day.currency)}${day.costPriceNote ? ` ${day.costPriceNote}` : ''}\n\n`;
    });

    const total = type === 'cost' ? result.totalCost : result.totalSelling;
    output += `────────────────\n`;
    output += `รวมทั้งหมด: ${formatPrice(total, '¥')}\n`;

    if (result.notes.length > 0) {
      output += `\nหมายเหตุ:\n`;
      result.notes.forEach(note => {
        output += `• ${note}\n`;
      });
    }

    return output;
  };

  const copyToClipboard = async (type: 'cost' | 'selling') => {
    const text = generateOutputText(type);
    await navigator.clipboard.writeText(text);
    setCopiedOutput(type);
    setTimeout(() => setCopiedOutput(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold font-serif text-gray-900 mb-2">
          Quotation Processor
        </h1>
        <p className="text-gray-500">
          ประมวลผลราคาจาก Operator และคำนวณราคาขายอัตโนมัติ
        </p>
      </div>

      {/* Input Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input 1: Our Quotation */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" />
              Input 1: Quotation ที่เราส่งให้ Operator
            </h2>
          </div>
          <textarea
            value={input1}
            onChange={(e) => setInput1(e.target.value)}
            placeholder={`K.(K)earn

2026-02-15
Coaster 17 seats
Charter 10H
Pickup Haneda Airport (arrive 05:40) => Stop Snow monkey viewing (Hakuba area) => Drop-off Hakuba Platinum (check-in 15:00)

2026-02-21
Coaster 17 seats
Pick up only
Pickup Hakuba Platinum (check-out 10:00) => Drop-off Mitsui Garden Premier`}
            className="w-full h-64 p-4 text-sm font-mono resize-none outline-none focus:ring-2 focus:ring-amber-500 focus:ring-inset"
          />
        </div>

        {/* Input 2: Operator Response */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-amber-500" />
              Input 2: ราคาที่ Operator ตอบกลับมา
            </h2>
          </div>
          <textarea
            value={input2}
            onChange={(e) => setInput2(e.target.value)}
            placeholder={`Date:2026-02-15
🚌Coaster
👛180000yen-10H

Date:2026-02-21
🚌Coaster
👛170000yen+5000yen（New Year Service Fee）-drop off`}
            className="w-full h-64 p-4 text-sm font-mono resize-none outline-none focus:ring-2 focus:ring-amber-500 focus:ring-inset"
          />
        </div>
      </div>

      {/* Process Button */}
      <div className="flex justify-center">
        <button
          onClick={processQuotation}
          disabled={isProcessing}
          className={clsx(
            "flex items-center gap-2 px-8 py-3 rounded-lg font-bold text-white transition-all",
            isProcessing
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 shadow-lg shadow-amber-500/30"
          )}
        >
          <Sparkles className={clsx("w-5 h-5", isProcessing && "animate-spin")} />
          {isProcessing ? 'กำลังประมวลผล...' : 'ประมวลผลด้วย AI'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-center">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Output 1: Cost Price */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-blue-50 px-4 py-3 border-b border-blue-200 flex items-center justify-between">
              <h2 className="font-bold text-blue-800">
                Output 1: ราคาต้นทุน (Cost)
              </h2>
              <button
                onClick={() => copyToClipboard('cost')}
                className={clsx(
                  "flex items-center gap-1 px-3 py-1.5 text-xs rounded-md font-medium transition-all",
                  copiedOutput === 'cost'
                    ? "bg-green-500 text-white"
                    : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                )}
              >
                {copiedOutput === 'cost' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedOutput === 'cost' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
              <div className="font-bold text-lg text-gray-900">{result.customerName}</div>
              
              {result.days.map((day, idx) => (
                <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="text-sm font-bold text-gray-900">{day.date}</div>
                  <div className="text-xs text-gray-600">{day.vehicle} • {day.serviceType}</div>
                  <div className="text-xs text-gray-500 mt-1">{day.route}</div>
                  <div className="text-lg font-bold text-blue-600 mt-2">
                    {formatPrice(day.costPrice, day.currency)}
                    {day.costPriceNote && (
                      <span className="text-xs font-normal text-gray-500 ml-2">
                        {day.costPriceNote}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-700">รวมต้นทุน:</span>
                  <span className="text-xl font-bold text-blue-600">
                    {formatPrice(result.totalCost, '¥')}
                  </span>
                </div>
              </div>

              {result.notes.length > 0 && (
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  <div className="text-xs font-bold text-yellow-800 mb-1">หมายเหตุจาก Operator:</div>
                  {result.notes.map((note, idx) => (
                    <div key={idx} className="text-xs text-yellow-700">• {note}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Output 2: Selling Price */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-green-50 px-4 py-3 border-b border-green-200 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-green-800">
                  Output 2: ราคาขาย (Selling)
                </h2>
                <p className="text-xs text-green-600">ต้นทุน × 1.391 (30% margin + 7% VAT)</p>
              </div>
              <button
                onClick={() => copyToClipboard('selling')}
                className={clsx(
                  "flex items-center gap-1 px-3 py-1.5 text-xs rounded-md font-medium transition-all",
                  copiedOutput === 'selling'
                    ? "bg-green-500 text-white"
                    : "bg-green-100 text-green-700 hover:bg-green-200"
                )}
              >
                {copiedOutput === 'selling' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedOutput === 'selling' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
              <div className="font-bold text-lg text-gray-900">{result.customerName}</div>
              
              {result.days.map((day, idx) => (
                <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="text-sm font-bold text-gray-900">{day.date}</div>
                  <div className="text-xs text-gray-600">{day.vehicle} • {day.serviceType}</div>
                  <div className="text-xs text-gray-500 mt-1">{day.route}</div>
                  <div className="text-lg font-bold text-green-600 mt-2">
                    {formatPrice(day.sellingPrice, day.currency)}
                  </div>
                  <div className="text-xs text-gray-400">
                    (ต้นทุน: {formatPrice(day.costPrice, day.currency)})
                  </div>
                </div>
              ))}

              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-700">รวมราคาขาย:</span>
                  <span className="text-xl font-bold text-green-600">
                    {formatPrice(result.totalSelling, '¥')}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-500 mt-1">
                  <span>กำไร:</span>
                  <span className="font-medium text-amber-600">
                    {formatPrice(result.totalSelling - result.totalCost, '¥')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Export Info */}
      {result && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <h3 className="font-bold text-gray-800 mb-2">📊 ข้อมูลสำหรับเก็บเข้าระบบ</h3>
          <pre className="bg-white p-3 rounded border border-gray-200 text-xs overflow-x-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

