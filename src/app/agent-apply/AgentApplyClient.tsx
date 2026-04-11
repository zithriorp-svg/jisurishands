"use client";

import { useState, useEffect } from "react";
import { submitAgentApplication } from "./actions";
import SignaturePad from "@/components/SignaturePad";

export default function AgentApplyClient({ defaultPortfolio }: { defaultPortfolio: string }) {
  const [formData, setFormData] = useState<any>({
    firstName: "", lastName: "", phone: "", address: "",
    birthDate: "", territory: "", networkSize: "1-10", employment: "",
    selfieUrl: "", idPhotoUrl: "", clearanceUrl: "", 
    collateralType: "", collateralValue: "", collateralCondition: "",
    collateralPhotoFront: "", collateralPhotoRear: "", collateralPhotoLeft: "",
    collateralPhotoRight: "", collateralPhotoSerial: "", collateralPhotoDocument: "",
    digitalSignature: "",
    portfolio: defaultPortfolio
  });

  const [status, setStatus] = useState("");
  const [locStatus, setLocStatus] = useState("Locating...");
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const geoOptions = { timeout: 3000, maximumAge: 10000, enableHighAccuracy: false };
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormData((prev: any) => ({...prev, locationLat: pos.coords.latitude, locationLng: pos.coords.longitude}));
          setLocStatus("Location Verified ✓");
        },
        () => setLocStatus("Location Bypassed"),
        geoOptions
      );
    } else {
      setLocStatus("Location Bypassed");
    }
  }, []);

  const handleImage = (e: any, field: string) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event: any) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 600;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.6);
        setFormData((prev: any) => ({...prev, [field]: compressedBase64}));
      };
    };
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setStatus("SUBMITTING AGENT DOSSIER...");
    try {
      const res = await submitAgentApplication(formData);
      if (res?.error) throw new Error(res.error);
      setIsSubmitted(true);
      setStatus("");
    } catch (error: any) {
      alert("Submission Error: " + error.message);
      setStatus("");
    }
  };

  const rapidInputStyle = "w-full bg-transparent p-3 text-sm border-b border-[#2a2a35] outline-none text-white appearance-none";
  const borderStyle = "border border-[#2a2a35] bg-[#0f0f13]";
  const headerStyle = "text-blue-600 font-bold text-lg mb-3 uppercase tracking-wider";
  const currentDate = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  // ============================================================================
  // SUCCESS & PRINT SCREEN 
  // ============================================================================
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#09090b] text-center p-8 flex flex-col items-center justify-center print:bg-white print:p-0">
        <div className="print:hidden w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">✓</div>
          <h1 className="text-2xl font-bold text-white mb-2">Application Received!</h1>
          <p className="text-zinc-400 text-sm mb-8">Your dossier has been securely transmitted. Please save a copy of your contract receipt now.</p>
          
          <button onClick={() => window.print()} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl mb-4 transition-all shadow-lg flex items-center justify-center gap-2">
            📄 SAVE PDF RECEIPT
          </button>
          
          <button onClick={() => window.location.href = '/'} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-xl transition-all">
            Return to Home
          </button>
        </div>

        {/* PRINT ONLY LAYOUT */}
        <div className="hidden print:block text-black w-full text-left font-sans">
          <div className="border-b-2 border-black pb-4 mb-4 text-center">
            <h1 className="text-2xl font-bold">FIELD AGENT APPLICATION RECEIPT</h1>
            <p className="text-sm text-gray-600">Division: {defaultPortfolio} • {currentDate}</p>
          </div>

          <h2 className="font-bold text-lg border-b border-black pb-1 mb-2 uppercase">Agent Applicant Information</h2>
          <div className="grid grid-cols-2 gap-y-1 text-sm mb-4">
            <div className="font-semibold">Full Name:</div><div>{formData.firstName} {formData.lastName}</div>
            <div className="font-semibold">Phone:</div><div>{formData.phone || '—'}</div>
            <div className="font-semibold">Address:</div><div>{formData.address || '—'}</div>
            <div className="font-semibold">Birth Date:</div><div>{formData.birthDate || '—'}</div>
          </div>
          
          <h2 className="font-bold text-lg border-b border-black pb-1 mb-2 uppercase">Territory & Capacity</h2>
          <div className="grid grid-cols-2 gap-y-1 text-sm mb-4">
            <div className="font-semibold">Primary Territory:</div><div>{formData.territory || '—'}</div>
            <div className="font-semibold">Network Size:</div><div>{formData.networkSize || '—'}</div>
            <div className="font-semibold">Employment/Business:</div><div>{formData.employment || '—'}</div>
          </div>

          <h2 className="font-bold text-lg border-b border-black pb-1 mb-2 uppercase">Pledged Collateral Declaration</h2>
          <div className="grid grid-cols-2 gap-y-1 text-sm mb-4">
            <div className="font-semibold">Asset Type:</div><div>{formData.collateralType || '—'}</div>
            <div className="font-semibold">Market Value:</div><div>₱{formData.collateralValue || '—'}</div>
            <div className="font-semibold col-span-2 mt-1">Specifications & Condition:</div>
            <div className="col-span-2">{formData.collateralCondition || '—'}</div>
          </div>

          {/* 🚀 PRINTABLE TAGALOG AGREEMENT */}
          <h2 className="font-bold text-lg border-b border-black pb-1 mb-2 uppercase mt-6 text-rose-900">Mga Tungkulin at Pananagutan (Agent Agreement)</h2>
          <div className="text-sm mb-4 pl-2 text-gray-800 space-y-1">
            <p><strong>✅ BENEPISYO:</strong> 40% komisyon mula sa purong interes.</p>
            <p><strong>🛠️ TUNGKULIN:</strong> Personal na magsasala ng kliyente at maniningil ng bayad.</p>
            <p className="text-rose-800 font-bold border border-rose-300 bg-rose-50 p-2 mt-1 rounded">
              ⚠️ PANANAGUTAN: Kung hindi magbayad ang kliyente, ang Agent (bilang Co-Maker) ang magbabayad ng utang. Kusang-loob na binibigyan ng karapatan ang kumpanya na hatakin (seize) ang kolateral sa itaas nang walang abiso sa korte.
            </p>
          </div>

          {formData.digitalSignature && (
            <div className="mt-4 pt-2 border-t border-black print:break-inside-avoid">
              <h2 className="font-bold text-lg mb-2 uppercase">Digital Signature</h2>
              <div className="border border-gray-400 p-2 inline-block">
                <img src={formData.digitalSignature} alt="Digital Signature" style={{ maxHeight: '80px', filter: 'invert(1) contrast(200%)' }} />
              </div>
              <p className="text-xs text-gray-500 font-bold uppercase mt-1">Signatory / Co-Maker: {formData.firstName} {formData.lastName}</p>
            </div>
          )}

          {/* PAGE 2: PHOTO GRID */}
          <div style={{ pageBreakBefore: 'always' }} className="pt-8">
            <h2 className="text-2xl font-bold text-black mb-1 text-center">APPENDIX A: FORENSIC & COLLATERAL EVIDENCE</h2>
            <p className="text-sm text-gray-600 text-center mb-4 border-b-2 border-black pb-4">Applicant: {formData.firstName} {formData.lastName}</p>

            <h3 className="font-bold text-lg mb-2 uppercase bg-gray-200 p-2">Identity Verification</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {formData.selfieUrl && <div className="border border-gray-300 p-2" style={{ pageBreakInside: 'avoid' }}><p className="font-bold text-xs mb-1 text-center">LIVE SELFIE</p><img src={formData.selfieUrl} className="w-full h-40 object-contain" /></div>}
              {formData.idPhotoUrl && <div className="border border-gray-300 p-2" style={{ pageBreakInside: 'avoid' }}><p className="font-bold text-xs mb-1 text-center">GOVERNMENT ID</p><img src={formData.idPhotoUrl} className="w-full h-40 object-contain" /></div>}
            </div>

            <h3 className="font-bold text-lg mb-2 uppercase bg-gray-200 p-2">6-Point Collateral Inspection</h3>
            <div className="grid grid-cols-2 gap-4">
              {formData.collateralPhotoFront && <div className="border border-gray-300 p-2" style={{ pageBreakInside: 'avoid' }}><p className="font-bold text-xs mb-1 text-center">FRONT VIEW</p><img src={formData.collateralPhotoFront} className="w-full h-40 object-contain" /></div>}
              {formData.collateralPhotoRear && <div className="border border-gray-300 p-2" style={{ pageBreakInside: 'avoid' }}><p className="font-bold text-xs mb-1 text-center">REAR VIEW</p><img src={formData.collateralPhotoRear} className="w-full h-40 object-contain" /></div>}
              {formData.collateralPhotoLeft && <div className="border border-gray-300 p-2" style={{ pageBreakInside: 'avoid' }}><p className="font-bold text-xs mb-1 text-center">LEFT VIEW</p><img src={formData.collateralPhotoLeft} className="w-full h-40 object-contain" /></div>}
              {formData.collateralPhotoRight && <div className="border border-gray-300 p-2" style={{ pageBreakInside: 'avoid' }}><p className="font-bold text-xs mb-1 text-center">RIGHT VIEW</p><img src={formData.collateralPhotoRight} className="w-full h-40 object-contain" /></div>}
              {formData.collateralPhotoSerial && <div className="border border-gray-300 p-2" style={{ pageBreakInside: 'avoid' }}><p className="font-bold text-xs mb-1 text-center">SERIAL / PLATE</p><img src={formData.collateralPhotoSerial} className="w-full h-40 object-contain" /></div>}
              {formData.collateralPhotoDocument && <div className="border border-gray-300 p-2" style={{ pageBreakInside: 'avoid' }}><p className="font-bold text-xs mb-1 text-center">TITLE / ORCR</p><img src={formData.collateralPhotoDocument} className="w-full h-40 object-contain" /></div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MAIN FORM RENDER
  // ============================================================================
  return (
    <div className="min-h-screen bg-[#09090b] text-gray-300 p-4 font-sans pb-20 print:hidden">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6 pt-4">
          <h1 className="text-3xl font-serif font-bold text-gray-200 mb-2">Field Agent<br/>Application</h1>
          <span className="bg-purple-900/30 text-purple-400 border border-purple-500/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest inline-block mb-3">
            DIVISION: {defaultPortfolio}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-7">
          
          <div>
            <h2 className={headerStyle}>1. Agent Dossier (Personal Info)</h2>
            <div className={`grid grid-cols-2 gap-0 ${borderStyle}`}>
              <input name="firstName" required placeholder="First Name" className={`${rapidInputStyle} border-r`} onChange={e => setFormData({...formData, firstName: e.target.value})} />
              <input name="lastName" required placeholder="Last Name" className={rapidInputStyle} onChange={e => setFormData({...formData, lastName: e.target.value})} />
              <input name="birthDate" required type="text" placeholder="Birth Date (YYYY-MM-DD)" className={`${rapidInputStyle} border-r col-span-1 text-gray-400`} onChange={e => setFormData({...formData, birthDate: e.target.value})} />
              <input name="phone" required placeholder="Phone Number" className={`${rapidInputStyle} col-span-2`} onChange={e => setFormData({...formData, phone: e.target.value})} />
              <input name="address" required placeholder="Full Address" className={`${rapidInputStyle} col-span-2 border-b-0`} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
          </div>

          <div>
            <h2 className={headerStyle}>2. Territory & Operational Capacity</h2>
            <div className={`${borderStyle} p-4 space-y-4`}>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Primary Operation Area (City/Barangay)</label>
                <input name="territory" required placeholder="e.g., Brgy. San Jose, Pasig City" className="w-full bg-black border border-zinc-800 rounded p-2 text-white text-sm" onChange={e => setFormData({...formData, territory: e.target.value})} />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Estimated Network Size</label>
                <select name="networkSize" className="w-full bg-black border border-zinc-800 rounded p-2 text-white text-sm" value={formData.networkSize} onChange={e => setFormData({...formData, networkSize: e.target.value})}>
                  <option value="1-10">1-10 people</option><option value="11-30">11-30 people</option><option value="31-50">31-50 people</option><option value="50+">50+ people</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Current Employment / Business</label>
                <input name="employment" required placeholder="e.g., Sari-sari store owner, Tricycle driver" className="w-full bg-black border border-zinc-800 rounded p-2 text-white text-sm" onChange={e => setFormData({...formData, employment: e.target.value})} />
              </div>
              <p className={`text-center text-xs pb-2 ${locStatus.includes('Verified') ? 'text-[#00df82]' : 'text-yellow-500'}`}>GPS: {locStatus}</p>
            </div>
          </div>

          <div>
            <h2 className="text-[#00df82] font-bold text-lg mb-3 uppercase tracking-wider">3. Forensic Verification Dossier</h2>
            <div className={`${borderStyle} p-4 space-y-4`}>
              <div className="grid grid-cols-1 gap-3 text-sm">
                {[
                  {field: 'selfieUrl', label: 'Live Selfie (capture)', required: true},
                  {field: 'idPhotoUrl', label: 'Valid Government ID', required: true},
                  {field: 'clearanceUrl', label: 'NBI / Barangay Clearance (Recommended)', required: false}
                ].map(item => (
                  <div key={item.field} className="bg-[#1c1c21] border border-[#2a2a35] rounded-lg p-3">
                    <label className="block text-gray-400 text-xs mb-1 uppercase tracking-widest">{item.label}</label>
                    <input name={item.field} type="file" accept="image/*" capture={item.field === 'selfieUrl' ? 'user' : undefined} required={item.required} className="w-full text-xs text-gray-500" onChange={e => handleImage(e, item.field)} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-purple-400 font-bold text-lg mb-1 uppercase tracking-wider">4. Collateral Declaration</h2>
            <div className={`${borderStyle} p-4 space-y-4`}>
              <div>
                <label className="text-xs text-zinc-400 font-bold uppercase tracking-widest block mb-1">Asset Type</label>
                <select required name="collateralType" className="w-full bg-black border border-zinc-800 rounded p-3 text-white text-sm" value={formData.collateralType} onChange={e => setFormData({...formData, collateralType: e.target.value})}>
                  <option value="">Select Category...</option>
                  <option value="Electronics">Electronics (Laptop, Phone, Tablet)</option>
                  <option value="Vehicle">Vehicle (Motorcycle, Car)</option>
                  <option value="Real Estate">Real Estate / Land</option>
                  <option value="Other">Other Valuable Asset</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 font-bold uppercase tracking-widest block mb-1">Estimated Market Value (₱)</label>
                <input required type="number" name="collateralValue" placeholder="e.g. 150000" className="w-full bg-black border border-zinc-800 rounded p-3 text-white text-sm" onChange={e => setFormData({...formData, collateralValue: e.target.value})} />
              </div>
              <div>
                <label className="text-xs text-zinc-400 font-bold uppercase tracking-widest block mb-1">Asset Specifications & Condition</label>
                <textarea required rows={3} name="collateralCondition" placeholder="Include Make, Model, Year, Serial Number, OR/CR Number..." className="w-full bg-black border border-zinc-800 rounded p-3 text-white text-sm" onChange={e => setFormData({...formData, collateralCondition: e.target.value})}></textarea>
              </div>
              
              <div className="pt-2 border-t border-zinc-800">
                <label className="text-xs text-zinc-400 font-bold uppercase tracking-widest block mb-3">Asset Photographic Evidence</label>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    {field: 'collateralPhotoFront', label: '📸 FRONT VIEW'},
                    {field: 'collateralPhotoRear', label: '📸 REAR / SIDE VIEW'},
                    {field: 'collateralPhotoLeft', label: '📸 LEFT VIEW'},
                    {field: 'collateralPhotoRight', label: '📸 RIGHT VIEW'},
                    {field: 'collateralPhotoSerial', label: '🔍 SERIAL / PLATE'},
                    {field: 'collateralPhotoDocument', label: '📄 TITLE / ORCR'}
                  ].map(item => (
                    <div key={item.field} className="bg-[#1c1c21] border border-[#2a2a35] rounded-lg p-3 text-center flex flex-col justify-center items-center">
                      <label className="block text-gray-400 text-[10px] mb-2 font-bold uppercase tracking-widest w-full cursor-pointer">
                        {item.label}
                        <input name={item.field} type="file" accept="image/*" className="w-full text-[10px] text-gray-500 mt-2" onChange={e => handleImage(e, item.field)} />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 🚀 TAGALOG BINDING AGREEMENT */}
          <div>
            <h2 className="text-rose-400 font-bold text-lg mb-3 uppercase tracking-wider">5. Mga Tungkulin at Responsibilidad (Agreement)</h2>
            <div className={`${borderStyle} p-5 space-y-4`}>
              
              <div className="text-sm text-slate-300 leading-relaxed mb-6 border-b border-zinc-800 pb-6">
                <p className="font-bold text-white uppercase mb-4">Bilang Field Agent at Co-Maker, sumasang-ayon ako sa sumusunod:</p>
                
                <div className="space-y-2 mb-4">
                  <h3 className="font-bold text-emerald-400 uppercase">✅ Mga Benepisyo (Pros)</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Makakatanggap ako ng <strong>40% komisyon</strong> mula sa purong interes ng mga pautang na matagumpay kong nakolekta.</li>
                    <li>Walang limitasyon sa maaaring kitain basta't maayos ang paniningil at walang nade-default.</li>
                  </ul>
                </div>

                <div className="space-y-2 mb-4">
                  <h3 className="font-bold text-blue-400 uppercase">🛠️ Mga Tungkulin (Responsibilities)</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Ako mismo ang magsasala (screen), mag-aapruba, at maniniguro na ang aking mga kliyente ay may kakayahang magbayad.</li>
                    <li>Ako ang personal na maniningil at magre-remit ng mga bayad sa itinakdang oras.</li>
                  </ul>
                </div>

                <div className="space-y-2 bg-rose-950/30 border border-rose-500/30 p-4 rounded-xl">
                  <h3 className="font-bold text-rose-400 uppercase">⚠️ Mga Panganib at Pananagutan (Cons & Liabilities)</h3>
                  <ul className="list-disc pl-5 space-y-2 text-rose-200">
                    <li><strong>AKO AY CO-MAKER:</strong> Kung hindi magbayad, magtago, o tumakbo ang aking kliyente, <strong>AKO</strong> bilang Co-Maker ang direktang magbabayad ng kanilang buong utang (Principal + Interest + Penalties).</li>
                    <li><strong>PAGHATAK NG KOLATERAL:</strong> Kung hindi ko mabayaran ang utang ng aking mga nag-default na kliyente, kusang-loob kong isinusuko at binibigyan ng karapatan ang kumpanya na <strong>HATAKIN (Seize)</strong> ang idineklara kong kolateral sa itaas upang ipambayad sa utang nang walang idinadaang proseso sa korte.</li>
                    <li>Ang hindi pag-remit ng nakolektang pera mula sa kliyente ay agarang sasampahan ng kasong kriminal (Estafa/Theft).</li>
                  </ul>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 text-xs mb-2 uppercase tracking-widest">Digital Signature (Sign Below)</label>
                <SignaturePad onSignature={(dataUrl) => setFormData(prev => ({...prev, digitalSignature: dataUrl}))} />
              </div>

              <div className="flex items-start gap-3 text-xs text-zinc-500 mt-4 bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
                <input type="checkbox" required className="w-6 h-6 accent-emerald-500 mt-0.5 cursor-pointer" />
                <span className="break-words leading-relaxed text-zinc-300">
                  <strong className="text-rose-400 uppercase block mb-1">Naiintindihan ko ang aking mga Tungkulin at Panganib.</strong>
                  Sumasang-ayon ako sa lahat ng nakasaad sa itaas. Kung may kliyente akong mag-default, sumasang-ayon ako na ang utang ay ililipat sa pangalan ko at ang aking kolateral ay maaaring hatakin.
                </span>
              </div>
            </div>
          </div>

          <button type="submit" disabled={status !== ""} className="w-full bg-[#00df82] border border-[#00df82]/40 text-[#09090b] py-5 font-black text-xs tracking-widest uppercase hover:bg-[#00df82]/80 disabled:opacity-50 rounded-xl transition-colors shadow-[0_0_20px_rgba(0,223,130,0.15)]">
            {status || "SUBMIT AGENT APPLICATION"}
          </button>
        </form>
      </div>
    </div>
  );
}

