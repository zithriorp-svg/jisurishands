"use client";

import { useState, useRef, useEffect } from "react";

export default function AgentApplyClient() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAssetType, setSelectedAssetType] = useState("");
  
  const [uploads, setUploads] = useState({
    idCard: null as File | null, selfie: null as File | null,
    collatFront: null as File | null, collatRear: null as File | null,
    collatLeft: null as File | null, collatRight: null as File | null,
    collatSerial: null as File | null, collatDoc: null as File | null,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) { ctx.strokeStyle = "white"; ctx.lineWidth = 3; ctx.lineCap = "round"; }
    }
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); setIsDrawing(true);
    const canvas = canvasRef.current; const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath(); ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return; e.preventDefault();
    const canvas = canvasRef.current; const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.lineTo(clientX - rect.left, clientY - rect.top); ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);
  const clearSignature = () => {
    const canvas = canvasRef.current; const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleFileChange = (key: keyof typeof uploads, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploads(prev => ({ ...prev, [key]: e.target.files![0] }));
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image(); img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800; let width = img.width; let height = img.height;
          if (width > MAX_WIDTH) { height = Math.round((height * MAX_WIDTH) / width); width = MAX_WIDTH; }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext("2d"); ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      const signatureData = canvasRef.current?.toDataURL();
      const phoneNum = formData.get("phone") as string;

      const payload = {
        firstName: formData.get("firstName"), lastName: formData.get("lastName"),
        phone: phoneNum, fbProfileUrl: formData.get("fbProfileUrl"),
        address: formData.get("address"), incomeSource: formData.get("incomeSource"),
        grossIncome: formData.get("grossIncome"), assetType: formData.get("assetType"),
        customAssetType: formData.get("customAssetType"), assetValue: formData.get("assetValue"),
        assetSpecs: formData.get("assetSpecs"), signatureData: signatureData,
        idCardData: uploads.idCard ? await fileToBase64(uploads.idCard) : "",
        selfieData: uploads.selfie ? await fileToBase64(uploads.selfie) : "",
        collatFront: uploads.collatFront ? await fileToBase64(uploads.collatFront) : "",
        collatRear: uploads.collatRear ? await fileToBase64(uploads.collatRear) : "",
        collatLeft: uploads.collatLeft ? await fileToBase64(uploads.collatLeft) : "",
        collatRight: uploads.collatRight ? await fileToBase64(uploads.collatRight) : "",
        collatSerial: uploads.collatSerial ? await fileToBase64(uploads.collatSerial) : "",
        collatDoc: uploads.collatDoc ? await fileToBase64(uploads.collatDoc) : "",
      };

      const res = await fetch("/api/agent-apply", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        // 🚀 Redirects perfectly to the new receipt page!
        window.location.href = `/agent-apply/receipt?phone=${encodeURIComponent(phoneNum)}`;
      } else { alert("Failed: " + data.error); setIsSubmitting(false); }
    } catch (err: any) {
      alert("Network Error"); setIsSubmitting(false);
    }
  };

  const FileButton = ({ fileKey, label, icon }: { fileKey: keyof typeof uploads, label: string, icon: string }) => (
    <label className={`flex flex-col items-center justify-center p-4 border border-dashed rounded-xl cursor-pointer transition-colors ${uploads[fileKey] ? 'bg-emerald-950/30 border-emerald-500 text-emerald-400' : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileChange(fileKey, e)} />
      <span className="text-2xl mb-2">{uploads[fileKey] ? '✅' : icon}</span>
      <span className="text-[10px] font-bold uppercase text-center">{uploads[fileKey] ? 'Captured' : label}</span>
    </label>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-8 pb-24">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center mb-10">
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-widest uppercase">Agent & Co-Maker<span className="block text-emerald-500">Official Application</span></h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1 & 2. PERSONAL & FINANCIAL */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="bg-slate-800/50 px-6 py-4 border-b border-slate-800"><h2 className="text-sm font-black text-white uppercase tracking-widest">1. Personal & Financial Matrix</h2></div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">First Name</label><input required name="firstName" type="text" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white" /></div>
              <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Last Name</label><input required name="lastName" type="text" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white" /></div>
              <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Phone</label><input required name="phone" type="tel" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white" /></div>
              <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Facebook URL</label><input required name="fbProfileUrl" type="url" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white" /></div>
              <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Complete Address</label><textarea required name="address" rows={2} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white"></textarea></div>
              <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Primary Income Source</label><input required name="incomeSource" placeholder="e.g. Call Center Agent, Sari-Sari Store" type="text" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white" /></div>
              <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Gross Monthly Income (₱)</label><input required name="grossIncome" type="number" placeholder="e.g. 25000" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white" /></div>
            </div>
          </div>

          {/* 3. IDENTITY VERIFICATION */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="bg-slate-800/50 px-6 py-4 border-b border-slate-800"><h2 className="text-sm font-black text-cyan-400 uppercase tracking-widest">2. Identity Verification</h2></div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <FileButton fileKey="idCard" label="Snap Valid ID" icon="🪪" />
              <label className={`flex flex-col items-center justify-center p-4 border border-dashed rounded-xl cursor-pointer transition-colors ${uploads.selfie ? 'bg-cyan-950/30 border-cyan-500 text-cyan-400' : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                <input required type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => handleFileChange('selfie', e)} />
                <span className="text-2xl mb-2">{uploads.selfie ? '✅' : '🤳'}</span>
                <span className="text-[10px] font-bold uppercase text-center">{uploads.selfie ? 'Selfie Captured' : 'Take Selfie with ID'}</span>
              </label>
            </div>
          </div>

          {/* 4. COLLATERAL DECLARATION */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="bg-slate-800/50 px-6 py-4 border-b border-slate-800"><h2 className="text-sm font-black text-purple-400 uppercase tracking-widest">3. Collateral Declaration</h2></div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Asset Type</label>
                  <select required name="assetType" value={selectedAssetType} onChange={(e) => setSelectedAssetType(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white">
                    <option value="">Select Category...</option>
                    <option value="Motorcycle / Scooter">Motorcycle / Scooter</option>
                    <option value="Car / SUV">Car / SUV</option>
                    <option value="Tricycle / E-Bike">Tricycle / E-Bike</option>
                    <option value="Land Title (TCT)">Land Title (TCT)</option>
                    <option value="House & Lot">House & Lot</option>
                    <option value="Laptop / MacBook">Laptop / MacBook</option>
                    <option value="Smartphone / iPhone">Smartphone / iPhone</option>
                    <option value="Jewelry / Gold">Jewelry / Watches / Gold</option>
                    <option value="Appliances">Appliances (TV, Fridge, etc.)</option>
                    <option value="Other">Other (Specify Below)</option>
                  </select>
                </div>
                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Estimated Value (₱)</label><input required name="assetValue" type="number" placeholder="e.g. 150000" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white" /></div>
              </div>

              {selectedAssetType === "Other" && (
                <div>
                  <label className="block text-xs font-bold text-purple-400 uppercase mb-2">Specify Nature of Collateral</label>
                  <input required name="customAssetType" type="text" placeholder="e.g. Heavy Machinery, Carabao, Farm Equipment" className="w-full bg-slate-950 border border-purple-500 rounded-xl p-3 text-white" />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Specifications & Condition (Be Specific)</label>
                <textarea required name="assetSpecs" rows={3} placeholder="EXAMPLE: Honda Click 125i 2023, Color Black. Plate No: 123ABC. Engine in perfect condition, minor scratches on the left fairing." className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white placeholder:text-slate-600"></textarea>
              </div>

              {/* 6-POINT CAMERA ARRAY */}
              <div className="pt-4 border-t border-slate-800">
                 <label className="block text-xs font-bold text-slate-400 uppercase mb-4 text-center">6-Point Photographic Inspection</label>
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <FileButton fileKey="collatFront" label="Front View" icon="📸" />
                    <FileButton fileKey="collatRear" label="Rear View" icon="📸" />
                    <FileButton fileKey="collatLeft" label="Left Side" icon="📸" />
                    <FileButton fileKey="collatRight" label="Right Side" icon="📸" />
                    <FileButton fileKey="collatSerial" label="Serial / Plate No." icon="🔍" />
                    <FileButton fileKey="collatDoc" label="ORCR / Receipt / Title" icon="📄" />
                 </div>
              </div>
            </div>
          </div>

          {/* 5. BINDING SIGNATURE */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="bg-slate-800/50 px-6 py-4 border-b border-slate-800"><h2 className="text-sm font-black text-rose-400 uppercase tracking-widest">4. Binding Signature</h2></div>
            <div className="p-6 space-y-6">
              <label className="flex items-start gap-4 p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
                <input required type="checkbox" className="w-5 h-5 mt-0.5 accent-rose-500 rounded" />
                <span className="text-xs md:text-sm text-slate-300 font-medium">I swear all info is true and I assume all liability as Co-Maker.</span>
              </label>
              <div className="pt-6 border-t border-slate-800">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Digital Signature (Draw Below)</label>
                  <div className="w-full bg-slate-950 border-2 border-slate-700 rounded-xl overflow-hidden relative touch-none">
                    <canvas ref={canvasRef} width={400} height={200} className="w-full h-[200px] cursor-crosshair" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
                  </div>
                  <button type="button" onClick={clearSignature} className="mt-2 text-xs text-rose-400 hover:text-rose-300 font-bold uppercase underline">Clear Signature</button>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button type="submit" disabled={isSubmitting} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest py-5 rounded-2xl shadow-lg transition-all text-sm md:text-base">
              {isSubmitting ? "Encrypting to Vault..." : "Submit Binding Application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
