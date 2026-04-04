FINTECH LOAN SYSTEM -- MASTER CODEBASE DOSSIER

\>\>\> FILE: src/app/globals.css

\@tailwind base;

\@tailwind components;

\@tailwind utilities;

:root {

/\* Tells mobile browsers to stop auto-inverting our colors \*/

Color-scheme: dark;

}

Body {

Background-color: #0f0f13;

Color: #ffffff;

}

/\* Force all input text to remain white \*/

Input, select, textarea {

Color: #ffffff !important;

}

/\* Prevent Android/Chrome autofill from turning backgrounds white \*/

Input:-webkit-autofill,

Input:-webkit-autofill:hover,

Input:-webkit-autofill:focus,

Input:-webkit-autofill:active {

-webkit-box-shadow: 0 0 0 30px #0f0f13 inset !important;

-webkit-text-fill-color: #ffffff !important;

Transition: background-color 5000s ease-in-out 0s;

}

/\* Hide scrollbar for the horizontal navigation \*/

.hide-scrollbar::-webkit-scrollbar {

Display: none;

}

.hide-scrollbar {

-ms-overflow-style: none;

Scrollbar-width: none;

}

\>\>\> FILE: src/app/page.tsx

Import { prisma } from "@/lib/db";

Import Link from "next/link";

Import MatrixCopilot from "@/components/MatrixCopilot";

Export const dynamic = "force-dynamic";

Export default async function Dashboard() {

Const ledgers = await prisma.ledger.findMany({ orderBy: { id: 'desc' }
});

Const apps = await prisma.application.findMany({ orderBy: { id: 'desc' }
});

Let vaultCash = 0;

Let deployedCapital = 0;

Ledgers.forEach(entry =\> {

Const amt = Number(entry.amount);

If (entry.debitAccount === "Vault Cash") vaultCash += amt;

If (entry.creditAccount === "Vault Cash") vaultCash -= amt;

If (entry.debitAccount === "Loans Receivable") deployedCapital += amt;

If (entry.creditAccount === "Loans Receivable") deployedCapital -= amt;

});

Return (

\<div className="min-h-screen bg-\[#09090b\] text-gray-300 p-4 font-sans
pb-20"\>

\<div className="flex justify-between items-end mb-6 pt-4 border-b
border-\[#2a2a35\] pb-4"\>

\<div\>

\<h1 className="text-3xl font-serif font-bold text-white
mb-1"\>Executive Dashboard\</h1\>

\<p className="text-xs text-gray-500 font-bold tracking-widest
uppercase"\>Branch: \<span className="text-\[#00df82\]"\>Main
Branch\</span\>\</p\>

\</div\>

\</div\>

\<div className="grid grid-cols-2 gap-3 mb-6 text-sm font-bold uppercase
tracking-widest text-center"\>

\<Link href="/apply" className="border border-\[#00df82\]/30
text-\[#00df82\] p-3 rounded-xl hover:bg-\[#00df82\]/10
transition-colors"\>âŠ• App Form\</Link\>

\<Link href="/treasury" className="border border-\[#2a2a35\]
text-gray-400 p-3 rounded-xl hover:bg-\[#1c1c21\]
transition-colors"\>âš--ï¸ Treasury\</Link\>

\</div\>

\<div className="bg-\[#0f0f13\] border border-\[#2a2a35\] rounded-2xl
p-5 mb-6 shadow-lg"\>

\<div className="mb-4 pb-4 border-b border-\[#2a2a35\]"\>

\<h2 className="text-xs text-gray-500 font-bold uppercase
tracking-widest mb-1"\>Available Vault Cash\</h2\>

\<div className="text-3xl font-black
text-\[#00df82\]"\>â‚±{vaultCash.toLocaleString('en-US',
{minimumFractionDigits: 2})}\</div\>

\</div\>

\<div\>

\<h2 className="text-xs text-gray-500 font-bold uppercase
tracking-widest mb-1"\>Deployed Capital\</h2\>

\<div className="text-xl font-black
text-white"\>â‚±{deployedCapital.toLocaleString('en-US',
{minimumFractionDigits: 2})}\</div\>

\</div\>

\</div\>

\<div className="mb-6"\>

\<h2 className="text-sm text-white font-bold uppercase tracking-widest
mb-3"\>Quick Actions\</h2\>

\<div className="grid grid-cols-1 gap-3"\>

\<Link href="/payments" className="bg-\[#0f0f13\] border
border-\[#00df82\]/30 p-4 rounded-xl hover:bg-\[#1c1c21\]
transition-colors flex items-center gap-3"\>

\<div className="text-\[#00df82\] text-xl"\>ðŸ'µ\</div\>

\<div\>

\<div className="font-bold text-white"\>Process Payment\</div\>

\<div className="text-xs text-gray-500"\>Record a collection\</div\>

\</div\>

\</Link\>

\</div\>

\</div\>

{/\* ðŸ"¥ THE PRECOGNITION HUD IS NOW HARD-WIRED \*/}

\<MatrixCopilot /\>

\<div className="mb-6"\>

\<h2 className="text-sm text-white font-bold uppercase tracking-widest
mb-3 flex justify-between items-center"\>

Pending Applications \<span className="text-xs text-gray-500
font-normal"\>AI-RATED\</span\>

\</h2\>

\<div className="space-y-3"\>

{apps.length === 0 ? (

\<div className="bg-\[#0f0f13\] border border-\[#2a2a35\] p-5 rounded-xl
text-center text-sm text-gray-500 font-bold"\>No new applications
received.\</div\>

) : (

Apps.map(app =\> (

\<Link href={\`/review/\${app.id}\`} key={app.id}
className="bg-\[#0f0f13\] border border-\[#2a2a35\] p-4 rounded-xl flex
justify-between items-center hover:bg-\[#1c1c21\] transition-colors
cursor-pointer block"\>

\<div\>

\<div className="font-bold text-white text-lg"\>{app.firstName}
{app.lastName}\</div\>

\<div className="text-xs text-gray-500 mt-1 truncate
max-w-\[200px\]"\>{app.aiRiskSummary}\</div\>

\</div\>

\<div className={\`w-10 h-10 rounded-lg flex items-center justify-center
font-black text-lg border \${

(app.credibilityScore \|\| 0) \>= 7 ? 'bg-\[#00df82\]/10
text-\[#00df82\] border-\[#00df82\]/30' :

(app.credibilityScore \|\| 0) \>= 4 ? 'bg-yellow-500/10 text-yellow-500
border-yellow-500/30' :

'bg-red-500/10 text-red-500 border-red-500/30'

}\`}\>

{app.credibilityScore \|\| '-'}

\</div\>

\</Link\>

))

)}

\</div\>

\</div\>

\<div\>

\<h2 className="text-sm text-white font-bold uppercase tracking-widest
mb-3"\>Recent Ledger Activity\</h2\>

\<div className="space-y-3"\>

{ledgers.slice(0, 5).map(ledger =\> (

\<div key={ledger.id} className="bg-\[#0f0f13\] border
border-\[#2a2a35\] p-3 rounded-xl flex justify-between items-center"\>

\<div\>

\<div className="font-bold text-sm
text-gray-200"\>{ledger.transactionType}\</div\>

\<div className="text-xs text-gray-500"\>{ledger.debitAccount} â†'
{ledger.creditAccount}\</div\>

\</div\>

\<div className={\`font-black \${ledger.debitAccount === 'Vault Cash' ?
'text-\[#00df82\]' : 'text-gray-300'}\`}\>

{ledger.debitAccount === 'Vault Cash' ? '+' :
''}â‚±{Number(ledger.amount).toLocaleString('en-US',
{minimumFractionDigits: 2})}

\</div\>

\</div\>

))}

\</div\>

\</div\>

\</div\>

);

}

\>\>\> FILE: src/app/layout.tsx

Export const dynamic = "force-dynamic";

Import "./globals.css";

Export const metadata = {

Title: 'FinTech Vault',

Description: 'Cloud Loan Management System',

}

Export default function RootLayout({ children }: { children:
React.ReactNode }) {

Return (

\<html lang="en"\>

\<body className="bg-\[#0a0a0a\] text-white antialiased"\>

{children}

\</body\>

\</html\>

)

}

\>\>\> FILE: src/app/expenses/page.tsx

Import Link from "next/link";

Import { PrismaClient } from "@prisma/client";

Import { redirect } from "next/navigation";

Import { TrendingDown } from "lucide-react";

Const prisma = new PrismaClient();

Export const dynamic = "force-dynamic";

Async function recordExpense(formData: FormData) {

"use server";

Const description = formData.get("description") as string;

Const amount = Number(formData.get("amount"));

If (!description \|\| !amount) return;

// Record the Expense (Double-Entry: Credit Cash, Debit Expense)

Await prisma.ledger.create({

Data: {

debitAccount: "Operating Expenses",

creditAccount: "Vault Cash",

amount: amount,

transactionType: \`Expense: \${description}\`,

}

});

Redirect("/");

}

Export default function ExpensesPage() {

Return (

\<main className="min-h-screen flex flex-col bg-\[#0f0f13\]"\>

{/\* GLOBAL HEADER \*/}

\<header className="flex justify-between items-center px-4 py-3 border-b
border-\[#1c1c21\] bg-\[#0f0f13\] sticky top-0 z-50"\>

\<div className="flex items-center space-x-3"\>

\<span className="text-white font-extrabold text-xl
tracking-wide"\>FinTech\</span\>

\<span className="bg-\[#1c1c21\] border border-\[#2a2a35\] text-xs px-3
py-1.5 rounded-full text-gray-300"\>

Cebu Branch

\</span\>

\</div\>

\<div className="bg-\[#1c1c21\] border border-\[#2a2a35\] text-xs px-3
py-1.5 rounded-full font-bold"\>

\<span className="text-yellow-500"\>FY:\</span\> \<span
className="text-white"\>2026\</span\>

\</div\>

\</header\>

{/\* GLOBAL NAVIGATION \*/}

\<nav className="flex overflow-x-auto gap-6 px-4 py-3 border-b
border-\[#1c1c21\] hide-scrollbar bg-\[#0f0f13\]"\>

\<Link href="/" className="text-gray-500 font-medium pb-1
whitespace-nowrap hover:text-white"\>Dashboard\</Link\>

\<Link href="/clients" className="text-gray-500 font-medium pb-1
whitespace-nowrap hover:text-white"\>Clients\</Link\>

\<Link href="/new-loan" className="text-gray-500 font-medium pb-1
whitespace-nowrap hover:text-white"\>Origination\</Link\>

\<Link href="/collections" className="text-gray-500 font-medium pb-1
whitespace-nowrap hover:text-white"\>Payments\</Link\>

\<Link href="/treasury" className="text-gray-500 font-medium pb-1
whitespace-nowrap hover:text-white"\>Treasury\</Link\>

\<Link href="/ledger" className="text-gray-500 font-medium pb-1
whitespace-nowrap hover:text-white"\>Ledger\</Link\>

\<Link href="/audit" className="text-gray-500 font-medium pb-1
whitespace-nowrap hover:text-white"\>Audit Log\</Link\>

\<Link href="/settings" className="text-gray-500 font-medium pb-1
whitespace-nowrap hover:text-white"\>âš™ï¸\</Link\>

\</nav\>

{/\* MAIN CONTENT AREA \*/}

\<div className="flex-1 p-4 space-y-6 overflow-y-auto pb-20"\>

{/\* View Header \*/}

\<div\>

\<h1 className="text-3xl font-bold text-red-500 mb-1
tracking-tight"\>Record Expense\</h1\>

\<p className="text-gray-400 text-sm"\>Active Database: \<span
className="text-white font-medium"\>Main Branch (Cloud
Edition)\</span\>\</p\>

\</div\>

{/\* Expense Form Card \*/}

\<div className="bg-\[#1c1c21\] border border-\[#2a2a35\] rounded-2xl
shadow-lg overflow-hidden"\>

\<div className="bg-\[#1a1c23\] px-5 py-3 border-b border-\[#2a2a35\]
flex items-center gap-2"\>

\<TrendingDown className="text-red-500" size={18} /\>

\<h2 className="text-white font-bold"\>Log Outgoing Cash\</h2\>

\</div\>

\<form action={recordExpense} className="p-5 space-y-4"\>

\<div\>

\<label className="block text-sm text-gray-400 mb-1"\>Expense
Description\</label\>

\<input type="text" name="description" required placeholder="e.g.
Internet Bill, Salary" className="w-full bg-\[#0f0f13\] border
border-\[#2a2a35\] rounded-lg p-3 text-white focus:outline-none
focus:border-red-500" /\>

\</div\>

\<div\>

\<label className="block text-sm text-gray-400 mb-1"\>Amount
(â‚±)\</label\>

\<input type="number" name="amount" required placeholder="0.00"
className="w-full bg-\[#0f0f13\] border border-\[#2a2a35\] rounded-lg
p-3 text-white focus:outline-none focus:border-red-500" /\>

\</div\>

\<button type="submit" className="w-full bg-red-500 hover:bg-red-600
text-white font-bold py-3 rounded-lg
shadow-\[0_0_15px_rgba(239,68,68,0.2)\] transition-colors mt-2"\>

Deduct from Vault

\</button\>

\</form\>

\</div\>

\</div\>

\</main\>

);

}

\>\>\> FILE: src/app/test/page.tsx

Import { PrismaClient } from "@prisma/client";

Export const dynamic = "force-dynamic";

Export default async function TestPage() {

Try {

Const prisma = new PrismaClient();

Const count = await prisma.ledger.count();

// If it works, it shows green!

Return (

\<div className="p-10 bg-\[#0a0a0a\] min-h-screen text-green-500
font-bold text-2xl"\>

ðŸŸ¢ SYSTEM GREEN: Database connected successfully! Total Ledger
entries: {count}

\</div\>

);

} catch (error: any) {

// If it fails, it prints the exact error in red!

Return (

\<div className="p-10 bg-\[#0a0a0a\] min-h-screen text-red-500
break-words"\>

\<h1 className="text-3xl font-bold mb-4"\>ðŸ"´ DATABASE CRASH
LOG:\</h1\>

\<p className="font-mono bg-black p-4 rounded border border-red-500"\>

{error.message \|\| "Unknown error occurred"}

\</p\>

\</div\>

);

}

}

\>\>\> FILE: src/app/new-loan/page.tsx

Import Link from "next/link";

Import { PrismaClient } from "@prisma/client";

Import { redirect } from "next/navigation";

Import { Calculator, Landmark } from "lucide-react";

Const prisma = new PrismaClient();

Export const dynamic = "force-dynamic";

Async function issueLoan(formData: FormData) {

"use server";

Const clientId = Number(formData.get("clientId"));

Const principal = Number(formData.get("principal"));

Const rate = Number(formData.get("rate"));

Const duration = Number(formData.get("duration")); // e.g. 30 days

If (!clientId \|\| !principal) return;

// 1. Create the Loan attached to the selected client

Const newLoan = await prisma.loan.create({

Data: {

clientId: clientId,

principal: principal,

interestRate: rate,

startDate: new Date(),

endDate: new Date(new Date().setDate(new Date().getDate() + duration)),

}

});

// 2. Record the Double-Entry Ledger

Const client = await prisma.client.findUnique({ where: { id: clientId }
});

Await prisma.ledger.create({

Data: {

debitAccount: "Loans Receivable",

creditAccount: "Vault Cash",

amount: principal,

transactionType: \`Disbursement: \${client?.firstName}
\${client?.lastName}\`,

loanId: newLoan.id

}

});

Redirect("/");

}

Export default async function OriginationPage() {

// Fetch active clients for the dropdown

Const clients = await prisma.client.findMany({ orderBy: { lastName:
'asc' } });

// Fetch Vault Cash

Const cashOut = await prisma.ledger.aggregate({ where: { creditAccount:
"Vault Cash" }, \_sum: { amount: true } });

Const cashIn = await prisma.ledger.aggregate({ where: { debitAccount:
"Vault Cash" }, \_sum: { amount: true } });

Const vaultCash = 50000 -- Number(cashOut.\_sum.amount \|\| 0) +
Number(cashIn.\_sum.amount \|\| 0);

Return (

\<main className="min-h-screen flex flex-col bg-\[#0f0f13\]"\>

{/\* GLOBAL HEADER \*/}

\<header className="flex justify-between items-center px-4 py-3 border-b
border-\[#1c1c21\] bg-\[#0f0f13\] sticky top-0 z-50"\>

\<div className="flex items-center space-x-3"\>

\<span className="text-white font-extrabold text-xl
tracking-wide"\>FinTech\</span\>

\<span className="bg-\[#1c1c21\] border border-\[#2a2a35\] text-xs px-3
py-1.5 rounded-full text-gray-300"\>

Cebu Branch

\</span\>

\</div\>

\<div className="bg-\[#1c1c21\] border border-\[#2a2a35\] text-xs px-3
py-1.5 rounded-full font-bold"\>

\<span className="text-yellow-500"\>FY:\</span\> \<span
className="text-white"\>2026\</span\>

\</div\>

\</header\>

{/\* GLOBAL NAVIGATION \*/}

\<nav className="flex overflow-x-auto gap-6 px-4 py-3 border-b
border-\[#1c1c21\] hide-scrollbar bg-\[#0f0f13\]"\>

\<Link href="/" className="text-gray-500 font-medium pb-1
whitespace-nowrap hover:text-white"\>Dashboard\</Link\>

\<Link href="/clients" className="text-gray-500 font-medium pb-1
whitespace-nowrap hover:text-white"\>Clients\</Link\>

\<span className="text-\[#38bdf8\] font-bold border-b-2
border-\[#38bdf8\] pb-1 whitespace-nowrap"\>Origination\</span\>

\<Link href="/collections" className="text-gray-500 font-medium pb-1
whitespace-nowrap hover:text-white"\>Payments\</Link\>

\<span className="text-gray-500 font-medium pb-1
whitespace-nowrap"\>Treasury\</span\>

\<span className="text-gray-500 font-medium pb-1
whitespace-nowrap"\>Ledger\</span\>

\<span className="text-gray-500 font-medium pb-1
whitespace-nowrap"\>Audit Log\</span\>

\<span className="text-gray-500 font-medium pb-1
whitespace-nowrap"\>âš™ï¸\</span\>

\</nav\>

{/\* MAIN CONTENT AREA \*/}

\<div className="flex-1 p-4 space-y-6 overflow-y-auto pb-20"\>

{/\* View Header & Widget \*/}

\<div className="flex justify-between items-start"\>

\<div\>

\<h1 className="text-3xl font-bold text-\[#38bdf8\] mb-1
tracking-tight"\>Origination & Schedule\</h1\>

\<p className="text-gray-400 text-sm"\>Active Database: \<span
className="text-white font-medium"\>Main Branch (Cloud
Edition)\</span\>\</p\>

\</div\>

\<div className="bg-\[#1c1c21\] border border-\[#2a2a35\] rounded-xl p-3
flex flex-col items-end min-w-\[100px\] shadow-lg"\>

\<span className="text-\[10px\] text-gray-400 font-bold tracking-wider
mb-1 uppercase"\>Available Vault Cash\</span\>

\<span className="text-xl font-extrabold
text-\[#00df82\]"\>â‚±{vaultCash.toLocaleString()}\</span\>

\</div\>

\</div\>

{/\* Form Area -- Loan Parameters \*/}

\<div className="bg-\[#1c1c21\] border border-\[#2a2a35\] rounded-2xl
shadow-lg overflow-hidden"\>

\<div className="bg-\[#1a1c23\] px-5 py-3 border-b border-\[#2a2a35\]"\>

\<h2 className="text-white font-bold"\>Loan Parameters\</h2\>

\</div\>

\<form action={issueLoan} className="p-5 space-y-4"\>

\<div\>

\<label className="block text-sm text-gray-400 mb-1"\>Select
Client\</label\>

\<select name="clientId" required className="w-full bg-\[#0f0f13\]
border border-\[#2a2a35\] rounded-lg p-3 text-white focus:outline-none
focus:border-\[#38bdf8\]"\>

\<option value=""\>\-- Choose a Client \--\</option\>

{clients.map(client =\> (

\<option key={client.id} value={client.id}\>{client.firstName}
{client.lastName}\</option\>

))}

\</select\>

\</div\>

\<div\>

\<label className="block text-sm text-gray-400 mb-1"\>Principal Amount
(â‚±)\</label\>

\<input type="number" name="principal" required className="w-full
bg-\[#0f0f13\] border border-\[#2a2a35\] rounded-lg p-3 text-white
focus:outline-none focus:border-\[#38bdf8\]" /\>

\</div\>

\<div\>

\<label className="block text-sm text-gray-400 mb-1"\>Total Flat
Interest Rate (%)\</label\>

\<input type="number" name="rate" defaultValue="5" className="w-full
bg-\[#0f0f13\] border border-\[#2a2a35\] rounded-lg p-3 text-white
focus:outline-none focus:border-\[#38bdf8\]" /\>

\</div\>

\<div className="grid grid-cols-2 gap-4"\>

\<div\>

\<label className="block text-sm text-gray-400 mb-1"\>Duration\</label\>

\<input type="number" name="duration" defaultValue="30"
className="w-full bg-\[#0f0f13\] border border-\[#2a2a35\] rounded-lg
p-3 text-white focus:outline-none focus:border-\[#38bdf8\]" /\>

\</div\>

\<div\>

\<label className="block text-sm text-gray-400 mb-1"\>Term
Type\</label\>

\<select className="w-full bg-\[#0f0f13\] border border-\[#2a2a35\]
rounded-lg p-3 text-white focus:outline-none focus:border-\[#38bdf8\]"\>

\<option\>Days\</option\>

\<option\>Months\</option\>

\<option\>Years\</option\>

\</select\>

\</div\>

\</div\>

\<div className="pt-2 flex flex-col gap-3"\>

{/\* Note: This is a placeholder for the simulator route we built
earlier \*/}

\<Link href="/calculator" className="w-full flex justify-center
items-center gap-2 bg-\[#0f0f13\] border border-\[#38bdf8\]
text-\[#38bdf8\] font-bold py-3 rounded-lg transition-colors
hover:bg-\[#38bdf8\]/10"\>

\<Calculator size={18} /\>

Calculate Schedule

\</Link\>

\<button type="submit" className="w-full flex justify-center
items-center gap-2 bg-\[#38bdf8\] hover:bg-\[#2fa0d6\] text-\[#0f0f13\]
font-bold py-3 rounded-lg shadow-lg transition-colors"\>

\<Landmark size={18} /\>

Issue Loan

\</button\>

\</div\>

\</form\>

\</div\>

{/\* Bottom Section -- Active Ledger \*/}

\<div className="bg-\[#1c1c21\] border border-\[#2a2a35\] rounded-2xl
shadow-lg overflow-hidden"\>

\<div className="bg-\[#1a1c23\] px-5 py-3 border-b border-\[#2a2a35\]"\>

\<h2 className="text-white font-bold"\>Active Ledger\</h2\>

\</div\>

\<div className="p-8 text-center text-gray-500 text-sm"\>

No active loans in this year.

\</div\>

\</div\>

\</div\>

\</main\>

);

}

\>\>\> FILE: src/app/collections/page.tsx

Import Link from "next/link";

Import { PrismaClient } from "@prisma/client";

Import { redirect } from "next/navigation";

Const prisma = new PrismaClient();

Export const dynamic = "force-dynamic";

Async function recordPayment(formData: FormData) {

"use server";

Const loanId = Number(formData.get("loanId"));

Const amount = Number(formData.get("amount"));

Const interest = Number(formData.get("interest"));

If (!loanId \|\| !amount) return;

// 1. Record the Payment

Await prisma.payment.create({

Data: { loanId, amount, paymentDate: new Date() }

});

// 2. Ledger Entry: Cash goes UP, Receivable goes DOWN

Await prisma.ledger.create({

Data: {

debitAccount: "Vault Cash",

creditAccount: "Loans Receivable",

amount: amount -- interest,

transactionType: \`Loan Repayment (Principal) -- Loan #\${loanId}\`,

}

});

// 3. Ledger Entry for Interest Earned

If (interest \> 0) {

Await prisma.ledger.create({

Data: {

debitAccount: "Vault Cash",

creditAccount: "Interest Income",

amount: interest,

transactionType: \`Interest Earned -- Loan #\${loanId}\`,

}

});

}

Redirect("/");

}

Export default async function CollectionsPage() {

Const activeLoans = await prisma.loan.findMany({ include: { client: true
} });

// Fetch recent payments for the history card

Const recentPayments = await prisma.payment.findMany({

Include: { loan: { include: { client: true } } },

orderBy: { id: 'desc' },

take: 5

});

Return (

\<main className="min-h-screen flex flex-col bg-\[#0f0f13\]"\>

{/\* GLOBAL HEADER \*/}

\<header className="flex justify-between items-center px-4 py-3 border-b
border-\[#1c1c21\] bg-\[#0f0f13\] sticky top-0 z-50"\>

\<div className="flex items-center space-x-3"\>

\<span className="text-white font-extrabold text-xl
tracking-wide"\>FinTech\</span\>

\<span className="bg-\[#1c1c21\] border border-\[#2a2a35\] text-xs px-3
py-1.5 rounded-full text-gray-300"\>

Cebu Branch

\</span\>

\</div\>

\<div className="bg-\[#1c1c21\] border border-\[#2a2a35\] text-xs px-3
py-1.5 rounded-full font-bold"\>

\<span className="text-yellow-500"\>FY:\</span\> \<span
className="text-white"\>2026\</span\>

\</div\>

\</header\>

{/\* GLOBAL NAVIGATION \*/}

\<nav className="flex overflow-x-auto gap-6 px-4 py-3 border-b
border-\[#1c1c21\] hide-scrollbar bg-\[#0f0f13\]"\>

\<Link href="/" className="text-gray-500 font-medium pb-1
whitespace-nowrap hover:text-white"\>Dashboard\</Link\>

\<Link href="/clients" className="text-gray-500 font-medium pb-1
whitespace-nowrap hover:text-white"\>Clients\</Link\>

\<Link href="/new-loan" className="text-gray-500 font-medium pb-1
whitespace-nowrap hover:text-white"\>Origination\</Link\>

\<span className="text-\[#00df82\] font-bold border-b-2
border-\[#00df82\] pb-1 whitespace-nowrap"\>Payments\</span\>

\<span className="text-gray-500 font-medium pb-1
whitespace-nowrap"\>Treasury\</span\>

\<span className="text-gray-500 font-medium pb-1
whitespace-nowrap"\>Ledger\</span\>

\<span className="text-gray-500 font-medium pb-1
whitespace-nowrap"\>Audit Log\</span\>

\<span className="text-gray-500 font-medium pb-1
whitespace-nowrap"\>âš™ï¸\</span\>

\</nav\>

{/\* MAIN CONTENT AREA \*/}

\<div className="flex-1 p-4 space-y-6 overflow-y-auto pb-20"\>

{/\* View Header \*/}

\<div\>

\<h1 className="text-3xl font-bold text-\[#00df82\] mb-1
tracking-tight"\>Payment Processing\</h1\>

\<p className="text-gray-400 text-sm"\>Active Database: \<span
className="text-white font-medium"\>Main Branch (Cloud
Edition)\</span\>\</p\>

\</div\>

{/\* Payment Dashboard Card \*/}

\<div className="bg-\[#1c1c21\] border border-\[#2a2a35\] rounded-2xl
shadow-lg overflow-hidden"\>

\<div className="bg-\[#1a1c23\] px-5 py-3 border-b border-\[#2a2a35\]"\>

\<h2 className="text-white font-bold"\>Payment Dashboard\</h2\>

\</div\>

\<form action={recordPayment} className="p-5 space-y-4"\>

\<div\>

\<select name="loanId" required className="w-full bg-\[#0f0f13\] border
border-\[#2a2a35\] rounded-lg p-3 text-white focus:outline-none
focus:border-\[#00df82\]"\>

\<option value=""\>\-- Select Active Loan \--\</option\>

{activeLoans.map(loan =\> (

\<option key={loan.id} value={loan.id}\>

{loan.client.firstName} {loan.client.lastName}
(â‚±{Number(loan.principal)})

\</option\>

))}

\</select\>

\</div\>

\<div className="grid grid-cols-2 gap-4"\>

\<div\>

\<input type="number" name="amount" required placeholder="Total Amount
(â‚±)" className="w-full bg-\[#0f0f13\] border border-\[#2a2a35\]
rounded-lg p-3 text-white focus:outline-none focus:border-\[#00df82\]"
/\>

\</div\>

\<div\>

\<input type="number" name="interest" defaultValue="0"
placeholder="Interest (â‚±)" className="w-full bg-\[#0f0f13\] border
border-\[#2a2a35\] rounded-lg p-3 text-white focus:outline-none
focus:border-\[#00df82\]" /\>

\</div\>

\</div\>

\<button type="submit" className="w-full bg-\[#00df82\]
hover:bg-\[#00c271\] text-\[#0f0f13\] font-bold py-3 rounded-lg
shadow-lg transition-colors mt-2"\>

Process Payment

\</button\>

\</form\>

\</div\>

{/\* Recent Transactions Card \*/}

\<div className="bg-\[#1c1c21\] border border-\[#2a2a35\] rounded-2xl
shadow-lg overflow-hidden"\>

\<div className="bg-\[#1a1c23\] px-5 py-3 border-b border-\[#2a2a35\]"\>

\<h2 className="text-white font-bold"\>Recent Transactions\</h2\>

\</div\>

\<div className="p-5"\>

{recentPayments.length === 0 ? (

\<p className="text-center text-gray-500 text-sm py-4"\>No payments in
this portfolio.\</p\>

) : (

\<div className="space-y-3"\>

{recentPayments.map(payment =\> (

\<div key={payment.id} className="flex justify-between items-center
border-b border-\[#2a2a35\] pb-3 last:border-0 last:pb-0"\>

\<div\>

\<p className="text-sm font-bold
text-white"\>{payment.loan.client.firstName}
{payment.loan.client.lastName}\</p\>

\<p className="text-xs text-gray-500
mt-0.5"\>{payment.paymentDate.toLocaleDateString()}\</p\>

\</div\>

\<p className="text-\[#00df82\] font-bold
text-sm"\>+â‚±{payment.amount.toLocaleString()}\</p\>

\</div\>

))}

\</div\>

)}

\</div\>

\</div\>

\</div\>

\</main\>

);

}

\>\>\> FILE: src/app/clients/page.tsx

Import Link from "next/link";

Import { PrismaClient } from "@prisma/client";

Import { Users } from "lucide-react";

Const prisma = new PrismaClient();

Export const dynamic = "force-dynamic";

Export default async function ClientsPage() {

Const clients = await prisma.client.findMany({

Include: { loans: { include: { payments: true } } },

orderBy: { id: 'desc' }

});

Const totalClients = clients.length;

Return (

\<main className="min-h-screen flex flex-col bg-\[#0f0f13\]"\>

{/\* GLOBAL HEADER \*/}

\<header className="flex justify-between items-center px-4 py-3 border-b
border-\[#1c1c21\] bg-\[#0f0f13\] sticky top-0 z-50"\>

\<div className="flex items-center space-x-3"\>

\<span className="text-white font-extrabold text-xl
tracking-wide"\>FinTech\</span\>

\<span className="bg-\[#1c1c21\] border border-\[#2a2a35\] text-xs px-3
py-1.5 rounded-full text-gray-300"\>

Cebu Branch

\</span\>

\</div\>

\<div className="bg-\[#1c1c21\] border border-\[#2a2a35\] text-xs px-3
py-1.5 rounded-full font-bold"\>

\<span className="text-yellow-500"\>FY:\</span\> \<span
className="text-white"\>2026\</span\>

\</div\>

\</header\>

{/\* GLOBAL NAVIGATION \*/}

\<nav className="flex overflow-x-auto gap-6 px-4 py-3 border-b
border-\[#1c1c21\] hide-scrollbar bg-\[#0f0f13\]"\>

\<Link href="/" className="text-gray-500 font-medium pb-1
whitespace-nowrap"\>Dashboard\</Link\>

\<span className="text-\[#3b82f6\] font-bold border-b-2
border-\[#3b82f6\] pb-1 whitespace-nowrap"\>Clients\</span\>

\<Link href="/new-loan" className="text-gray-500 font-medium pb-1
whitespace-nowrap"\>Origination\</Link\>

\<Link href="/collections" className="text-gray-500 font-medium pb-1
whitespace-nowrap"\>Payments\</Link\>

\<span className="text-gray-500 font-medium pb-1
whitespace-nowrap"\>Treasury\</span\>

\<span className="text-gray-500 font-medium pb-1
whitespace-nowrap"\>Ledger\</span\>

\<span className="text-gray-500 font-medium pb-1
whitespace-nowrap"\>Audit Log\</span\>

\<span className="text-gray-500 font-medium pb-1
whitespace-nowrap"\>âš™ï¸\</span\>

\</nav\>

{/\* MAIN CONTENT AREA \*/}

\<div className="flex-1 p-4 space-y-6 overflow-y-auto pb-20"\>

{/\* View Header & Widget \*/}

\<div className="flex justify-between items-start"\>

\<div\>

\<h1 className="text-3xl font-bold text-\[#3b82f6\] mb-1
tracking-tight"\>Client Command Center\</h1\>

\<p className="text-gray-400 text-sm"\>Active Database: \<span
className="text-white font-medium"\>Main Branch (Cloud
Edition)\</span\>\</p\>

\</div\>

\<div className="bg-\[#1c1c21\] border border-\[#2a2a35\] rounded-xl p-3
flex flex-col items-center min-w-\[80px\] shadow-lg"\>

\<span className="text-\[10px\] text-gray-400 font-bold tracking-wider
mb-1"\>TOTAL CLIENTS\</span\>

\<span className="text-2xl font-extrabold
text-white"\>{totalClients}\</span\>

\</div\>

\</div\>

{/\* Client List \*/}

\<div className="space-y-4"\>

{clients.length === 0 ? (

\<div className="bg-\[#1c1c21\] border border-\[#2a2a35\] rounded-2xl
p-10 flex flex-col items-center justify-center text-center shadow-lg
mt-8"\>

\<Users className="w-12 h-12 text-gray-600 mb-3" /\>

\<p className="text-gray-400 font-medium"\>No clients found in this
portfolio.\</p\>

\</div\>

) : (

Clients.map(client =\> (

\<div key={client.id} className="bg-\[#1c1c21\] border
border-\[#2a2a35\] rounded-2xl p-5 shadow-lg relative overflow-hidden"\>

\<div className="flex items-center space-x-3 mb-3"\>

\<div className="w-10 h-10 rounded-full bg-\[#2a2a35\] flex items-center
justify-center text-\[#3b82f6\] font-bold text-xl"\>

{client.firstName.charAt(0)}{client.lastName.charAt(0)}

\</div\>

\<div\>

\<h2 className="text-lg font-bold text-white"\>{client.firstName}
{client.lastName}\</h2\>

\<p className="text-xs text-gray-400"\>Client ID:
TXN-{client.id.toString().padStart(4, '0')}\</p\>

\</div\>

\</div\>

\<div className="space-y-2 mt-4 pt-4 border-t border-\[#2a2a35\]"\>

{client.loans.map(loan =\> {

Const totalPaid = loan.payments.reduce((sum, p) =\> sum +
Number(p.amount), 0);

Return (

\<div key={loan.id} className="bg-\[#0f0f13\] p-3 rounded-lg border
border-\[#2a2a35\]"\>

\<div className="flex justify-between text-sm mb-1"\>

\<span className="text-gray-400"\>Principal Issued:\</span\>

\<span className="font-bold
text-white"\>â‚±{loan.principal.toLocaleString()}\</span\>

\</div\>

\<div className="flex justify-between text-sm mb-1"\>

\<span className="text-gray-400"\>Interest Rate:\</span\>

\<span className="text-white"\>{Number(loan.interestRate)}%\</span\>

\</div\>

\<div className="flex justify-between text-sm pt-2 border-t
border-\[#1c1c21\]"\>

\<span className="text-gray-400"\>Total Collected:\</span\>

\<span className="font-bold
text-\[#3b82f6\]"\>â‚±{totalPaid.toLocaleString()}\</span\>

\</div\>

\</div\>

)

})}

\</div\>

\</div\>

))

)}

\</div\>

\</div\>

\</main\>

);

}

\>\>\> FILE: src/app/analytics/page.tsx

Import Link from "next/link";

Import { PrismaClient } from "@prisma/client";

Const prisma = new PrismaClient();

Export const dynamic = "force-dynamic";

Export default async function AnalyticsPage() {

// 1. Calculate Total Interest Revenue (Profit)

Const interestResult = await prisma.ledger.aggregate({

Where: { creditAccount: "Interest Income" },

\_sum: { amount: true }

});

Const totalInterest = interestResult.\_sum.amount \|\| 0;

// 2. Calculate Total Operating Expenses

Const expenseResult = await prisma.ledger.aggregate({

Where: { debitAccount: { startsWith: "Expense" } },

\_sum: { amount: true }

});

Const totalExpenses = expenseResult.\_sum.amount \|\| 0;

// 3. Calculate Net Profit

Const netProfit = Number(totalInterest \|\| 0) -- Number(totalExpenses
\|\| 0);

// 4. Calculate Outstanding Loan Portfolio (Money on the street)

// Total Disbursed (Debits to Loans Receivable) minus Total Paid
(Credits to Loans Receivable)

Const loansGiven = await prisma.ledger.aggregate({

Where: { debitAccount: "Loans Receivable" },

\_sum: { amount: true }

});

Const loansPaid = await prisma.ledger.aggregate({

Where: { creditAccount: "Loans Receivable" },

\_sum: { amount: true }

});

Const outstandingPrincipal = Number(loansGiven.\_sum.amount \|\| 0) --
Number(loansPaid.\_sum.amount \|\| 0);

Return (

\<main className="min-h-screen bg-\[#0a0a0a\] text-white p-6"\>

\<div className="max-w-md mx-auto space-y-6"\>

\<Link href="/" className="text-gray-400 hover:text-white
transition-colors"\>â† Back to Dashboard\</Link\>

\<div\>

\<h1 className="text-3xl font-bold text-\[#00df82\]"\>Financial
Analytics\</h1\>

\<p className="text-gray-400 text-sm mt-1"\>Live Profit & Loss
Statement\</p\>

\</div\>

{/\* P&L Statement \*/}

\<div className="bg-\[#111111\] border border-\[#222222\] rounded-xl p-6
shadow-2xl space-y-4"\>

\<h2 className="text-gray-400 text-xs font-bold tracking-widest
uppercase mb-4 border-b border-\[#333\] pb-2"\>Revenue & Expenses\</h2\>

\<div className="flex justify-between items-center"\>

\<span className="text-sm text-gray-300"\>Total Interest
Revenue\</span\>

\<span className="font-bold
text-\[#00df82\]"\>â‚±{totalInterest.toLocaleString()}\</span\>

\</div\>

\<div className="flex justify-between items-center"\>

\<span className="text-sm text-gray-300"\>Total Operating
Expenses\</span\>

\<span className="font-bold
text-red-400"\>-â‚±{totalExpenses.toLocaleString()}\</span\>

\</div\>

\<div className="pt-4 border-t border-\[#333\] flex justify-between
items-center"\>

\<span className="text-lg font-bold text-white"\>Net Profit\</span\>

\<span className={\`text-2xl font-extrabold \${netProfit \>= 0 ?
'text-\[#00df82\]' : 'text-red-500'}\`}\>

{netProfit \>= 0 ? '+' : ''}â‚±{netProfit.toLocaleString()}

\</span\>

\</div\>

\</div\>

{/\* Portfolio Health \*/}

\<div className="bg-\[#111111\] border border-\[#222222\] rounded-xl p-6
shadow-2xl space-y-4"\>

\<h2 className="text-gray-400 text-xs font-bold tracking-widest
uppercase mb-4 border-b border-\[#333\] pb-2"\>Portfolio Health\</h2\>

\<div className="flex justify-between items-center"\>

\<span className="text-sm text-gray-300"\>Outstanding Principal (On the
street)\</span\>

\<span className="font-bold
text-yellow-400"\>â‚±{outstandingPrincipal.toLocaleString()}\</span\>

\</div\>

\</div\>

\</div\>

\</main\>

);

}

\>\>\> FILE: src/app/calculator/page.tsx

"use client";

Import Link from "next/link";

Import { useState } from "react";

Export default function CalculatorPage() {

Const \[principal, setPrincipal\] = useState\<number\>(5000);

Const \[rate, setRate\] = useState\<number\>(5);

Const \[months, setMonths\] = useState\<number\>(3);

Const totalInterest = principal \* (rate / 100) \* months;

Const totalRepayment = principal + totalInterest;

Const monthlyInstallment = totalRepayment / months;

// Generate the Amortization Schedule

Const schedule = Array.from({ length: months }, (\_, i) =\> ({

Month: I + 1,

Payment: monthlyInstallment,

principalPortion: principal / months,

interestPortion: totalInterest / months,

remainingBalance: totalRepayment -- (monthlyInstallment \* (I + 1))

}));

Return (

\<main className="min-h-screen bg-\[#0a0a0a\] text-white p-6"\>

\<div className="max-w-md mx-auto space-y-6"\>

\<Link href="/" className="text-gray-400 hover:text-white
transition-colors"\>â† Back to Dashboard\</Link\>

\<div\>

\<h1 className="text-3xl font-bold text-\[#00df82\]"\>Loan
Simulator\</h1\>

\<p className="text-gray-400 text-sm mt-1"\>Real-time Amortization
Engine\</p\>

\</div\>

{/\* Dynamic Inputs \*/}

\<div className="bg-\[#111111\] border border-\[#222222\] rounded-xl p-6
shadow-2xl space-y-4"\>

\<div\>

\<label className="block text-sm text-gray-400 mb-1"\>Principal Amount
(â‚±)\</label\>

\<input

Type="number"

Value={principal}

onChange={€ =\> setPrincipal(Number(e.target.value) \|\| 0)}

className="w-full bg-\[#0a0a0a\] border border-\[#333\] rounded-lg p-3
text-white focus:border-\[#00df82\] outline-none transition-all"

/\>

\</div\>

\<div className="flex space-x-4"\>

\<div className="flex-1"\>

\<label className="block text-sm text-gray-400 mb-1"\>Monthly Rate
(%)\</label\>

\<input

Type="number"

Value={rate}

onChange={€ =\> setRate(Number(e.target.value) \|\| 0)}

className="w-full bg-\[#0a0a0a\] border border-\[#333\] rounded-lg p-3
text-white focus:border-\[#00df82\] outline-none transition-all"

/\>

\</div\>

\<div className="flex-1"\>

\<label className="block text-sm text-gray-400 mb-1"\>Term
(Months)\</label\>

\<input

Type="number"

Value={months}

onChange={€ =\> setMonths(Number(e.target.value) \|\| 1)}

className="w-full bg-\[#0a0a0a\] border border-\[#333\] rounded-lg p-3
text-white focus:border-\[#00df82\] outline-none transition-all"

min="1"

/\>

\</div\>

\</div\>

\</div\>

{/\* Live Results \*/}

\<div className="grid grid-cols-2 gap-4"\>

\<div className="bg-\[#111111\] border border-\[#222222\] rounded-xl p-4
text-center"\>

\<p className="text-xs text-gray-400 mb-1"\>Total Return\</p\>

\<p className="text-xl font-bold text-\[#00df82\]"\>

Â‚±{totalRepayment.toLocaleString(undefined, {minimumFractionDigits: 2,
maximumFractionDigits: 2})}

\</p\>

\</div\>

\<div className="bg-\[#111111\] border border-\[#222222\] rounded-xl p-4
text-center"\>

\<p className="text-xs text-gray-400 mb-1"\>Monthly Installment\</p\>

\<p className="text-xl font-bold text-white"\>

Â‚±{monthlyInstallment.toLocaleString(undefined, {minimumFractionDigits:
2, maximumFractionDigits: 2})}

\</p\>

\</div\>

\</div\>

{/\* Amortization Table \*/}

{months \> 0 && (

\<div className="bg-\[#111111\] border border-\[#222222\] rounded-xl
overflow-hidden shadow-2xl"\>

\<div className="bg-\[#222222\] p-3 text-xs font-bold text-gray-400 flex
justify-between uppercase tracking-wider"\>

\<span\>Month\</span\>

\<span\>Payment\</span\>

\<span\>Balance\</span\>

\</div\>

{schedule.map((row) =\> (

\<div key={row.month} className="p-3 border-t border-\[#222\] flex
justify-between text-sm"\>

\<span className="text-gray-400"\>M-{row.month}\</span\>

\<span className="text-\[#00df82\] font-bold"\>

Â‚±{row.payment.toLocaleString(undefined, {minimumFractionDigits: 2,
maximumFractionDigits: 2})}

\</span\>

\<span className="text-white"\>

Â‚±{Math.abs(row.remainingBalance).toLocaleString(undefined,
{minimumFractionDigits: 2, maximumFractionDigits: 2})}

\</span\>

\</div\>

))}

\</div\>

)}

\</div\>

\</main\>

);

}

\>\>\> FILE: src/app/api/export/route.ts

Import { PrismaClient } from "@prisma/client";

Const prisma = new PrismaClient();

Export const dynamic = "force-dynamic";

Export async function GET() {

// Fetch the entire ledger history

Const ledger = await prisma.ledger.findMany({

orderBy: { id: "desc" }

});

// Build the CSV Headers

Let csv = "Transaction ID,Description,Debit Account,Credit
Account,Amount (PHP)\\n";

// Format the data into CSV rows

Ledger.forEach((entry) =\> {

// Escape quotes to prevent CSV breaking

Const safeDescription = entry.transactionType.replace(/"/g, '""');

Const formattedId = \`TXN-\${entry.id.toString().padStart(4, "0")}\`;

Csv +=
\`"\${formattedId}","\${safeDescription}","\${entry.debitAccount}","\${entry.creditAccount}",\${entry.amount}\\n\`;

});

// Force the browser to download the file

Return new Response(csv, {

Status: 200,

Headers: {

"Content-Type": "text/csv",

"Content-Disposition": \`attachment;
filename="FinTech_Vault_Backup.csv"\`,

},

});

}

\>\>\> FILE: src/app/api/chat/route.ts

Import { GoogleGenerativeAI } from '@google/generative-ai';

Import { NextResponse } from 'next/server';

Export async function POST(req: Request) {

Try {

Const apiKey = process.env.GEMINI_API_KEY;

If (!apiKey) return NextResponse.json({ error: "SYSTEM FAULT: Missing
Key." }, { status: 500 });

Const genAI = new GoogleGenerativeAI(apiKey);

Const { message, stats } = await req.json();

// ðŸš€ THE NON-PRO FIX: Using the high-speed Gemini 2.5 Flash

// This model is optimized for high-volume tasks and real-time
reasoning.

Const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

Const systemPrompt = \`You are the Overall Brain of the FinTech Matrix.

YOUR ROLES:

\- Chief Financial Strategist & Accountant: Analyze vault cash
(â‚±\${stats.vaultCash}) and deployed capital
(â‚±\${stats.deployedCapital}) to maximize profit.

\- Corporate Lawyer: Provide strategic legal guidance for lending
operations in the Philippines.

\- Cognitive Investigator (CI) & Psychologist: Identify deceit, analyze
risk, and drive for a 0% default rate.

\- Software Manager: Suggest real-time system upgrades.

CURRENT STATS:

-   Vault: â‚±\${stats.vaultCash} \| Deployed:
    â‚±\${stats.deployedCapital} \| Loans: \${stats.activeLoans} \|
    Clients: \${stats.totalClients}

USER MESSAGE: "\${message}"

RESPONSE STYLE:

Be sharp, strategic, and concise. Use actionable bullet points. No
fluff.\`;

Const result = await model.generateContent(systemPrompt);

Const response = await result.response;

Return NextResponse.json({ reply: response.text() });

} catch (error: any) {

Console.error("AI ERROR:", error);

// If 2.5 Flash has a quota limit of 0 on your specific account, we will
see it here.

Return NextResponse.json({ error: \`ENGINE REJECTION:
\${error.message}\` }, { status: 500 });

}

}

\>\>\> FILE: src/app/api/matrix/route.ts

Import { NextResponse } from "next/server";

Import { prisma } from "@/lib/db";

Import { GoogleGenerativeAI } from "@google/generative-ai";

Export async function POST(req: Request) {

Try {

Const { prompt } = await req.json();

Const ledgers = await prisma.ledger.findMany();

Let vaultCash = 0;

Let deployedCapital = 0;

Ledgers.forEach(entry =\> {

Const amt = Number(entry.amount);

If (entry.debitAccount === "Vault Cash") vaultCash += amt;

If (entry.creditAccount === "Vault Cash") vaultCash -= amt;

If (entry.debitAccount === "Loans Receivable") deployedCapital += amt;

If (entry.creditAccount === "Loans Receivable") deployedCapital -= amt;

});

Const monthlyProfit = deployedCapital \* 0.20;

Const dailyProfit = monthlyProfit / 30;

Const systemPrompt = \`You are the Matrix AI Co-Pilot, an elite FinTech
Business Architect, Data Scientist, and Strategic Forecaster.

LIVE TELEMETRY:

\- Vault Cash: PHP \${vaultCash}

\- Deployed Capital: PHP \${deployedCapital}

\- Current Daily Profit Yield: PHP \${dailyProfit}

USER PROMPT: "\${prompt}"

CRITICAL MERMAID.JS SYNTAX RULEBOOK:

You MUST generate visual diagrams using Mermaid.js syntax. However, you
have been writing invalid syntax causing the renderer to crash.

YOU MUST OBEY THESE RULES STRICTLY:

1\. NO SPACES OR SPECIAL CHARACTERS IN NODE IDs. (Use A1, B2, Node1. DO
NOT use "Node 1" or "A B").

2\. ALWAYS wrap Node Labels in double quotes. Example: A1\["High Risk
Client"\] 🡪 B2\["Reject Application"\]

3\. Do NOT use experimental chart types like sankey-beta. Stick to
highly stable charts: Flowcharts (graph TD or graph LR) and Pie charts
(pie).

4\. Wrap all Mermaid code strictly in markdown blocks:

\\\`\\\`\\\`mermaid

Graph TD

Vault\["Vault Cash"\] 🡪 Branch1\["Satellite Branch 1"\]

\\\`\\\`\\\`

Be sharp, highly analytical, and focus on aggressive but calculated
financial scaling. Respond to the user's prompt using these visual
rules.\`;

Const apiKey = process.env.GEMINI_API_KEY;

Const genAI = new GoogleGenerativeAI(apiKey!);

Const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

Const result = await model.generateContent(systemPrompt);

Return NextResponse.json({ reply: result.response.text() });

} catch (error: any) {

Return NextResponse.json({ reply: \`âš ï¸ MATRIX ERROR:
\${error.message}\` }, { status: 500 });

}

}

\>\>\> FILE: src/app/treasury/page.tsx

Import { prisma } from "@/lib/db";

Import Link from "next/link";

Export default async function TreasuryPage() {

// Pull all raw ledger entries

Const ledgers = await prisma.ledger.findMany();

// The Accounting Engine

Const accounts: Record\<string, { debit: number; credit: number }\> =
{};

Let totalDebit = 0;

Let totalCredit = 0;

Ledgers.forEach((entry) =\> {

// ðŸ"¥ THE FIX: Forcing strict mathematical numbers, destroying the
string concatenation bug

Const amt = Number(entry.amount);

// Process Debits

If (!accounts\[entry.debitAccount\]) accounts\[entry.debitAccount\] = {
debit: 0, credit: 0 };

Accounts\[entry.debitAccount\].debit += amt;

totalDebit += amt;

// Process Credits

If (!accounts\[entry.creditAccount\]) accounts\[entry.creditAccount\] =
{ debit: 0, credit: 0 };

Accounts\[entry.creditAccount\].credit += amt;

totalCredit += amt;

});

Return (

\<div className="min-h-screen bg-\[#09090b\] text-white p-4 pb-20
font-sans"\>

\<div className="flex justify-between items-center mb-6 pt-2 border-b
border-\[#2a2a35\] pb-4"\>

\<div\>

\<h1 className="text-2xl font-serif font-bold text-\[#00df82\]"\>Trial
Balance\</h1\>

\<p className="text-xs text-gray-500 font-bold tracking-widest uppercase
mt-1"\>Active Database: Main Branch\</p\>

\</div\>

\<Link href="/" className="text-gray-500 font-bold text-sm uppercase
tracking-widest hover:text-white transition-colors"\>â† Dash\</Link\>

\</div\>

\<div className="bg-\[#0f0f13\] border border-\[#2a2a35\] rounded-2xl
overflow-hidden shadow-lg"\>

{/\* TABLE HEADER \*/}

\<div className="grid grid-cols-3 bg-\[#1c1c21\] p-4 text-\[10px\]
font-black text-gray-500 uppercase tracking-widest border-b
border-\[#2a2a35\]"\>

\<div\>Account\</div\>

\<div className="text-right"\>Debit (â‚±)\</div\>

\<div className="text-right"\>Credit (â‚±)\</div\>

\</div\>

{/\* TABLE BODY \*/}

{Object.keys(accounts).sort().map(accountName =\> (

\<div key={accountName} className="grid grid-cols-3 p-4 border-b
border-\[#2a2a35\] text-sm hover:bg-\[#1c1c21\]/50 transition-colors"\>

\<div className="font-bold text-gray-300"\>{accountName}\</div\>

\<div className="text-right text-gray-400"\>

{accounts\[accountName\].debit \> 0 ?
accounts\[accountName\].debit.toLocaleString('en-US',
{minimumFractionDigits: 2}) : '-'}

\</div\>

\<div className="text-right text-gray-400"\>

{accounts\[accountName\].credit \> 0 ?
accounts\[accountName\].credit.toLocaleString('en-US',
{minimumFractionDigits: 2}) : '-'}

\</div\>

\</div\>

))}

{/\* GRAND TOTAL \*/}

\<div className="grid grid-cols-3 bg-\[#00df82\]/10 p-4 border-t-2
border-\[#00df82\]/30 text-sm font-black"\>

\<div className="text-\[#00df82\] uppercase tracking-widest
text-\[10px\]"\>GRAND TOTAL\</div\>

\<div className="text-right text-\[#00df82\]"\>

Â‚±{totalDebit.toLocaleString('en-US', {minimumFractionDigits: 2})}

\</div\>

\<div className="text-right text-\[#00df82\]"\>

Â‚±{totalCredit.toLocaleString('en-US', {minimumFractionDigits: 2})}

\</div\>

\</div\>

\</div\>

\</div\>

);

}

\>\>\> FILE: src/app/ledger/page.tsx

Import Link from "next/link";

Import { PrismaClient } from "@prisma/client";

Import { Clipboard } from "lucide-react";

Const prisma = new PrismaClient();

Export const dynamic = "force-dynamic";

Export default async function LedgerPage() {

// 1. Fetch entire ledger

Const ledger = await prisma.ledger.findMany();

// 2. Compute Trial Balance mathematically in memory

Const tb: Record\<string, { debit: number, credit: number }\> = {};

Let totalDebit = 0;

Let totalCredit = 0;

Ledger.forEach(entry =\> {

// Process Debits

If (!tb\[entry.debitAccount\]) tb\[entry.debitAccount\] = { debit: 0,
credit: 0 };

Tb\[entry.debitAccount\].debit += Number(entry.amount);

totalDebit += Number(entry.amount);

// Process Credits

If (!tb\[entry.creditAccount\]) tb\[entry.creditAccount\] = { debit: 0,
credit: 0 };

Tb\[entry.creditAccount\].credit += Number(entry.amount);

totalCredit += Number(entry.amount);

});

Const accounts = Object.keys(tb).sort();

Return (

\<main className="min-h-screen flex flex-col bg-\[#0f0f13\]"\>

{/\* GLOBAL HEADER \*/}

\<header className="flex justify-between items-center px-4 py-3 border-b
border-\[#1c1c21\] bg-\[#0f0f13\] sticky top-0 z-50"\>

\<div className="flex items-center space-x-3"\>

\<span className="text-white font-extrabold text-xl
tracking-wide"\>FinTech\</span\>

\<span className="bg-\[#1c1c21\] border border-\[#2a2a35\] text-xs px-3
py-1.5 rounded-full text-gray-300"\>

Cebu Branch

\</span\>

\</div\>

\<div className="bg-\[#1c1c21\] border border-\[#2a2a35\] text-xs px-3
py-1.5 rounded-full font-bold"\>

\<span className="text-yellow-500"\>FY:\</span\> \<span
className="text-white"\>2026\</span\>

\</div\>

\</header\>

{/\* GLOBAL NAVIGATION \*/}

\<nav className="flex overflow-x-auto gap-6 px-4 py-3 border-b
border-\[#1c1c21\] hide-scrollbar bg-\[#0f0f13\]"\>

\<Link href="/" className="text-gray-500 font-medium pb-1
whitespace-nowrap hover:text-white"\>Dashboard\</Link\>

\<Link href="/clients" className="text-gray-500 font-medium pb-1
whitespace-nowrap hover:text-white"\>Clients\</Link\>

\<Link href="/new-loan" className="text-gray-500 font-medium pb-1
whitespace-nowrap hover:text-white"\>Origination\</Link\>

\<Link href="/collections" className="text-gray-500 font-medium pb-1
whitespace-nowrap hover:text-white"\>Payments\</Link\>

\<Link href="/treasury" className="text-gray-500 font-medium pb-1
whitespace-nowrap hover:text-white"\>Treasury\</Link\>

\<span className="text-\[#38bdf8\] font-bold border-b-2
border-\[#38bdf8\] pb-1 whitespace-nowrap"\>Ledger\</span\>

\<span className="text-gray-500 font-medium pb-1
whitespace-nowrap"\>Audit Log\</span\>

\<span className="text-gray-500 font-medium pb-1
whitespace-nowrap"\>âš™ï¸\</span\>

\</nav\>

{/\* MAIN CONTENT AREA \*/}

\<div className="flex-1 p-4 space-y-6 overflow-y-auto pb-20"\>

{/\* View Header & Action \*/}

\<div className="flex justify-between items-start"\>

\<div\>

\<h1 className="text-3xl font-bold text-\[#38bdf8\] mb-1
tracking-tight"\>Trial Balance\</h1\>

\<p className="text-gray-400 text-sm"\>Active Database: \<span
className="text-white font-medium"\>Main Branch (Cloud
Edition)\</span\>\</p\>

\</div\>

\<a href="/api/export" className="flex items-center gap-2 bg-\[#1c1c21\]
border border-\[#2a2a35\] px-3 py-2 rounded-lg text-gray-400 text-xs
font-bold hover:text-white hover:border-gray-500 transition-colors
shadow-lg"\>

\<Clipboard size={14} /\>

Copy CSV

\</a\>

\</div\>

{/\* Data Table \*/}

\<div className="bg-\[#1c1c21\] border border-\[#2a2a35\] rounded-2xl
shadow-lg overflow-hidden"\>

\<div className="overflow-x-auto"\>

\<table className="w-full text-sm text-left"\>

\<thead className="bg-\[#1a1c23\] text-gray-400 text-xs uppercase
tracking-wider border-b border-\[#2a2a35\]"\>

\<tr\>

\<th className="px-4 py-4 font-bold"\>Account\</th\>

\<th className="px-4 py-4 font-bold text-right"\>Debit (â‚±)\</th\>

\<th className="px-4 py-4 font-bold text-right"\>Credit (â‚±)\</th\>

\</tr\>

\</thead\>

\<tbody className="divide-y divide-\[#2a2a35\]"\>

{accounts.map(acc =\> (

\<tr key={acc} className="hover:bg-\[#202026\] transition-colors"\>

\<td className="px-4 py-4 text-white font-medium"\>{acc}\</td\>

\<td className="px-4 py-4 text-right font-bold text-\[#00df82\]"\>

{tb\[acc\].debit \> 0 ? tb\[acc\].debit.toLocaleString('en-US', {
minimumFractionDigits: 2 }) : \<span
className="text-gray-600"\>-\</span\>}

\</td\>

\<td className="px-4 py-4 text-right font-bold text-red-500"\>

{tb\[acc\].credit \> 0 ? tb\[acc\].credit.toLocaleString('en-US', {
minimumFractionDigits: 2 }) : \<span
className="text-gray-600"\>-\</span\>}

\</td\>

\</tr\>

))}

\</tbody\>

\<tfoot className="bg-\[#1a1c23\] border-t-2 border-\[#38bdf8\]"\>

\<tr\>

\<td className="px-4 py-4 font-extrabold text-white"\>GRAND TOTAL\</td\>

\<td className="px-4 py-4 text-right font-extrabold text-\[#00df82\]
underline decoration-double"\>

{totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}

\</td\>

\<td className="px-4 py-4 text-right font-extrabold text-red-500
underline decoration-double"\>

{totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}

\</td\>

\</tr\>

\</tfoot\>

\</table\>

\</div\>

\</div\>

\</div\>

\</main\>

);

}

\>\>\> FILE: src/app/audit/page.tsx

Import Link from "next/link";

Import { PrismaClient } from "@prisma/client";

Import { ShieldCheck } from "lucide-react";

Const prisma = new PrismaClient();

Export const dynamic = "force-dynamic";

Export default async function AuditLogPage() {

// Fetch ledger history, sorted newest first

Const ledger = await prisma.ledger.findMany({

orderBy: { id: 'desc' },

take: 100 // Cap at 100 for mobile render performance

});

Return (

\<main className="min-h-screen flex flex-col bg-\[#0f0f13\]"\>

{/\* GLOBAL HEADER \*/}

\<header className="flex justify-between items-center px-4 py-3 border-b
border-\[#1c1c21\] bg-\[#0f0f13\] sticky top-0 z-50"\>

\<div className="flex items-center space-x-3"\>

\<span className="text-white font-extrabold text-xl
tracking-wide"\>FinTech\</span\>

\<span className="bg-\[#1c1c21\] border border-\[#2a2a35\] text-xs px-3
py-1.5 rounded-full text-gray-300"\>

Cebu Branch

\</span\>

\</div\>

\<div className="bg-\[#1c1c21\] border border-\[#2a2a35\] text-xs px-3
py-1.5 rounded-full font-bold"\>

\<span className="text-yellow-500"\>FY:\</span\> \<span
className="text-white"\>2026\</span\>

\</div\>

\</header\>

{/\* GLOBAL NAVIGATION \*/}

\<nav className="flex overflow-x-auto gap-6 px-4 py-3 border-b
border-\[#1c1c21\] hide-scrollbar bg-\[#0f0f13\]"\>

\<Link href="/" className="text-gray-500 font-medium pb-1
whitespace-nowrap hover:text-white"\>Dashboard\</Link\>

\<Link href="/clients" className="text-gray-500 font-medium pb-1
whitespace-nowrap hover:text-white"\>Clients\</Link\>

\<Link href="/new-loan" className="text-gray-500 font-medium pb-1
whitespace-nowrap hover:text-white"\>Origination\</Link\>

\<Link href="/collections" className="text-gray-500 font-medium pb-1
whitespace-nowrap hover:text-white"\>Payments\</Link\>

\<Link href="/treasury" className="text-gray-500 font-medium pb-1
whitespace-nowrap hover:text-white"\>Treasury\</Link\>

\<Link href="/ledger" className="text-gray-500 font-medium pb-1
whitespace-nowrap hover:text-white"\>Ledger\</Link\>

\<span className="text-\[#a855f7\] font-bold border-b-2
border-\[#a855f7\] pb-1 whitespace-nowrap"\>Audit Log\</span\>

\<span className="text-gray-500 font-medium pb-1
whitespace-nowrap"\>âš™ï¸\</span\>

\</nav\>

{/\* MAIN CONTENT AREA \*/}

\<div className="flex-1 p-4 space-y-6 overflow-y-auto pb-20"\>

{/\* View Header \*/}

\<div className="flex justify-between items-start"\>

\<div\>

\<h1 className="text-3xl font-bold text-\[#a855f7\] mb-1 tracking-tight
flex items-center gap-2"\>

\<ShieldCheck size={28} /\> Master Audit Log

\</h1\>

\<p className="text-gray-400 text-sm"\>Active Database: \<span
className="text-white font-medium"\>Main Branch (Cloud
Edition)\</span\>\</p\>

\</div\>

\</div\>

{/\* Data Table \*/}

\<div className="bg-\[#1c1c21\] border border-\[#2a2a35\] rounded-2xl
shadow-lg overflow-hidden"\>

\<div className="overflow-x-auto"\>

\<table className="w-full text-sm text-left"\>

\<thead className="bg-\[#1a1c23\] text-gray-400 text-\[10px\] uppercase
tracking-wider border-b border-\[#2a2a35\]"\>

\<tr\>

\<th className="px-4 py-3 font-bold"\>TX ID & DATE\</th\>

\<th className="px-4 py-3 font-bold"\>DESCRIPTION\</th\>

\<th className="px-4 py-3 font-bold text-right"\>LEDGER ENTRIES\</th\>

\</tr\>

\</thead\>

\<tbody className="divide-y divide-\[#2a2a35\]"\>

{ledger.map(entry =\> {

// Fallback date generation if timestamp isn't explicitly stored

Const now = new Date();

Return (

\<tr key={entry.id} className="hover:bg-\[#202026\] transition-colors
align-top"\>

\<td className="px-4 py-4 whitespace-nowrap"\>

\<div className="font-bold text-white
mb-1"\>TXN-{entry.id.toString().padStart(4, '0')}\</div\>

\<div className="text-gray-500 text-\[10px\]
uppercase"\>{now.toISOString().split('T')\[0\]}\</div\>

\<div className="text-gray-600
text-\[10px\]"\>{now.toLocaleTimeString(\[\], {hour: '2-digit',
minute:'2-digit'})}\</div\>

\</td\>

\<td className="px-4 py-4"\>

\<div className="text-gray-300 text-xs
font-medium"\>{entry.transactionType}\</div\>

\</td\>

\<td className="px-4 py-4 text-right whitespace-nowrap"\>

\<div className="mb-2"\>

\<span className="text-gray-400 text-\[10px\] block
mb-0.5"\>{entry.debitAccount}\</span\>

\<span className="text-\[#00df82\] font-bold text-xs"\>+
â‚±{entry.amount.toLocaleString()} (DR)\</span\>

\</div\>

\<div\>

\<span className="text-gray-400 text-\[10px\] block
mb-0.5"\>{entry.creditAccount}\</span\>

\<span className="text-red-500 font-bold text-xs"\>-
â‚±{entry.amount.toLocaleString()} (CR)\</span\>

\</div\>

\</td\>

\</tr\>

)

})}

\</tbody\>

\</table\>

\</div\>

\</div\>

\</div\>

\</main\>

);

}

\>\>\> FILE: src/app/settings/page.tsx

Import Link from "next/link";

Import { Folder, Sparkles } from "lucide-react";

Export default function SettingsPage() {

Return (

\<main className="min-h-screen flex flex-col bg-\[#0f0f13\]"\>

{/\* GLOBAL HEADER \*/}

\<header className="flex justify-between items-center px-4 py-3 border-b
border-\[#1c1c21\] bg-\[#0f0f13\] sticky top-0 z-50"\>

\<div className="flex items-center space-x-3"\>

\<span className="text-white font-extrabold text-xl
tracking-wide"\>FinTech\</span\>

\<span className="bg-\[#1c1c21\] border border-\[#2a2a35\] text-xs px-3
py-1.5 rounded-full text-gray-300"\>

Cebu Branch

\</span\>

\</div\>

\<div className="bg-\[#1c1c21\] border border-\[#2a2a35\] text-xs px-3
py-1.5 rounded-full font-bold"\>

\<span className="text-yellow-500"\>FY:\</span\> \<span
className="text-white"\>2026\</span\>

\</div\>

\</header\>

{/\* GLOBAL NAVIGATION \*/}

\<nav className="flex overflow-x-auto gap-6 px-4 py-3 border-b
border-\[#1c1c21\] hide-scrollbar bg-\[#0f0f13\]"\>

\<Link href="/" className="text-gray-500 font-medium pb-1
whitespace-nowrap hover:text-white"\>Dashboard\</Link\>

\<Link href="/clients" className="text-gray-500 font-medium pb-1
whitespace-nowrap hover:text-white"\>Clients\</Link\>

\<Link href="/new-loan" className="text-gray-500 font-medium pb-1
whitespace-nowrap hover:text-white"\>Origination\</Link\>

\<Link href="/collections" className="text-gray-500 font-medium pb-1
whitespace-nowrap hover:text-white"\>Payments\</Link\>

\<Link href="/treasury" className="text-gray-500 font-medium pb-1
whitespace-nowrap hover:text-white"\>Treasury\</Link\>

\<Link href="/ledger" className="text-gray-500 font-medium pb-1
whitespace-nowrap hover:text-white"\>Ledger\</Link\>

\<Link href="/audit" className="text-gray-500 font-medium pb-1
whitespace-nowrap hover:text-white"\>Audit Log\</Link\>

\<span className="text-white font-bold border-b-2 border-white pb-1
whitespace-nowrap"\>âš™ï¸\</span\>

\</nav\>

{/\* MAIN CONTENT AREA \*/}

\<div className="flex-1 p-4 space-y-6 overflow-y-auto pb-20"\>

{/\* View Header \*/}

\<div\>

\<h1 className="text-3xl font-bold text-white mb-1
tracking-tight"\>System Settings\</h1\>

\</div\>

{/\* Card 1 -- Active Fiscal Year \*/}

\<div className="bg-\[#1c1c21\] border border-\[#2a2a35\] rounded-2xl
p-5 shadow-lg"\>

\<div className="flex items-center gap-3 mb-2"\>

\<div className="p-2 bg-\[#2a2a35\] rounded-lg text-\[#f59e0b\]"\>

\<Folder size={20} /\>

\</div\>

\<h2 className="text-white font-bold text-lg"\>Active Fiscal Year\</h2\>

\</div\>

\<p className="text-gray-400 text-xs mb-4"\>Switch between existing
yearly databases.\</p\>

\<div className="space-y-3"\>

\<select className="w-full bg-\[#0f0f13\] border border-\[#2a2a35\]
rounded-lg p-3 text-white focus:outline-none focus:border-\[#f59e0b\]"\>

\<option\>Main Branch (Cloud Edition)\</option\>

\<option\>2026 (Legacy)\</option\>

\</select\>

\<button className="w-full border border-\[#2a2a35\]
hover:bg-\[#2a2a35\] text-white font-bold py-3 rounded-lg
transition-colors text-sm"\>

Switch Year

\</button\>

\</div\>

\</div\>

{/\* Card 2 -- Start Fresh Fiscal Year \*/}

\<div className="bg-\[#1c1c21\] border border-\[#2a2a35\] rounded-2xl
p-5 shadow-lg"\>

\<div className="flex items-center gap-3 mb-2"\>

\<div className="p-2 bg-\[#2a2a35\] rounded-lg text-yellow-400"\>

\<Sparkles size={20} /\>

\</div\>

\<h2 className="text-white font-bold text-lg"\>Start Fresh Fiscal
Year\</h2\>

\</div\>

\<p className="text-gray-400 text-xs mb-4"\>Create a brand new, empty
ledger partition for a new year. Balances will start at â‚±0.\</p\>

\<div className="space-y-3"\>

\<input type="text" defaultValue="2027" placeholder="New Fiscal Year
(e.g., 2027)" className="w-full bg-\[#0f0f13\] border border-\[#2a2a35\]
rounded-lg p-3 text-white focus:outline-none focus:border-blue-500" /\>

\<button className="w-full bg-blue-600 hover:bg-blue-700 text-white
font-bold py-3 rounded-lg transition-colors text-sm shadow-lg"\>

Initialize New Year

\</button\>

\</div\>

\</div\>

\</div\>

\</main\>

);

}

\>\>\> FILE: src/app/auth/page.tsx

Import { Landmark, Unlock } from "lucide-react";

Import { redirect } from "next/navigation";

Async function login(formData: FormData) {

"use server";

Const password = formData.get("password");

// The master key as defined in your spec

If (password === "123456") {

Redirect("/");

}

}

Export default function AuthPage() {

Return (

\<main className="min-h-screen flex flex-col items-center justify-center
bg-\[#0f0f13\] p-4"\>

\<div className="w-full max-w-sm space-y-6"\>

{/\* Logo & Header \*/}

\<div className="text-center space-y-2 flex flex-col items-center"\>

\<div className="relative"\>

\<Landmark className="text-white w-16 h-16" /\>

\<span className="absolute -top-2 -right-2 text-blue-500 text-2xl
font-black drop-shadow-lg"\>\$\</span\>

\</div\>

\<h1 className="text-3xl font-extrabold text-white tracking-wide
mt-2"\>FinTech Connect\</h1\>

\<p className="text-gray-500 text-sm tracking-widest uppercase
font-bold"\>Authorized Personnel Only\</p\>

\</div\>

{/\* Form Card \*/}

\<div className="bg-\[#1c1c21\] border border-\[#2a2a35\] rounded-2xl
p-6 shadow-2xl"\>

\<form action={login} className="space-y-5"\>

\<div\>

\<label className="block text-xs font-bold text-gray-400 mb-2 uppercase
tracking-wider"\>Master Password\</label\>

\<input

Type="password"

Name="password"

Required

Placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"

className="w-full bg-\[#0f0f13\] border border-\[#2a2a35\] rounded-lg
p-3.5 text-white focus:outline-none focus:border-\[#00df82\] text-center
tracking-\[0.2em\] font-bold"

/\>

\</div\>

\<button type="submit" className="w-full flex items-center
justify-center gap-2 bg-\[#00df82\] hover:bg-\[#00c271\]
text-\[#0f0f13\] font-extrabold py-3.5 rounded-lg
shadow-\[0_0_15px_rgba(0,223,130,0.2)\] transition-colors"\>

\<Unlock size={18} strokeWidth={3} /\>

Access System

\</button\>

\</form\>

\</div\>

\</div\>

\</main\>

);

}

\>\>\> FILE: src/app/apply/page.tsx

"use client";

Import { useState, useEffect } from "react";

Import { submitApplicationRecord } from "./actions";

Export default function ApplyPage() {

Const \[formData, setFormData\] = useState\<any\>({

firstName: "", lastName: "", phone: "", address: "",

birthDate: "", age: "",

employment: "", income: "", fbProfileUrl: "", messengerId: "",

// Checkbox/Selection conversions

familySize: "1", workingMembers: "1", students: "0", infants: "0",

housingStatus: "Owned", rentAmount: "", monthlyBills: "",

// New Forensic CI

existingLoansDetails: "", monthlyDebtPayment: "",

referenceName: "", referencePhone: "",

locationLat: "", locationLng: "", locationUrl: "",

selfieUrl: "", idPhotoUrl: "",

// New Image slots

payslipPhotoUrl: "", electricBillPhotoUrl: "", waterBillPhotoUrl: "",

collateralUrl: ""

});

Const \[status, setStatus\] = useState("");

Const \[locStatus, setLocStatus\] = useState("Locating...");

useEffect(() =\> {

const geoOptions = { timeout: 3000, maximumAge: 10000,
enableHighAccuracy: false };

if ("geolocation" in navigator) {

navigator.geolocation.getCurrentPosition(

(pos) =\> {

setFormData((prev: any) =\> ({...prev, locationLat: pos.coords.latitude,
locationLng: pos.coords.longitude}));

setLocStatus("Location Verified âœ"");

},

() =\> setLocStatus("Location Bypassed"),

geoOptions

);

} else {

setLocStatus("Location Bypassed");

}

}, \[\]);

Const handleImage = (e: any, field: string) =\> {

Const file = e.target.files\[0\];

If (!file) return;

Const reader = new FileReader();

Reader.readAsDataURL(file);

Reader.onload = (event: any) =\> {

Const img = new Image();

Img.src = event.target.result;

Img.onload = () =\> {

Const canvas = document.createElement("canvas");

Const MAX_WIDTH = 600;

Const scaleSize = MAX_WIDTH / img.width;

Canvas.width = MAX_WIDTH;

Canvas.height = img.height \* scaleSize;

Const ctx = canvas.getContext("2d");

Ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

Const compressedBase64 = canvas.toDataURL("image/jpeg", 0.6);

setFormData((prev: any) =\> ({...prev, \[field\]: compressedBase64}));

};

};

};

Const calculateAge = (bday: string) =\> {

If (!bday) return;

Const birthDate = new Date(bday);

Const today = new Date();

Let age = today.getFullYear() -- birthDate.getFullYear();

Const m = today.getMonth() -- birthDate.getMonth();

If (m \< 0 \|\| (m === 0 && today.getDate() \< birthDate.getDate())) {
age\--; }

setFormData((prev: any) =\> ({...prev, birthDate: bday, age: age}));

};

Const handleSubmit = async (e: any) =\> {

e.preventDefault();

setStatus("UPLOADING FORENSIC DOSSIER...");

try {

const res = await submitApplicationRecord(formData);

if (res?.error) throw new Error(res.error);

alert("Application Received! Our AI is performing a forensic review.");

window.location.href = "/";

} catch (error: any) {

Alert("Matrix Error: " + error.message);

setStatus("");

}

};

Const rapidInputStyle = "w-full bg-transparent p-3 text-sm border-b
border-\[#2a2a35\] outline-none text-white appearance-none";

Const borderStyle = "border border-\[#2a2a35\] bg-\[#0f0f13\]";

Const headerStyle = "text-blue-600 font-bold text-lg mb-3 uppercase
tracking-wider";

Return (

\<div className="min-h-screen bg-\[#09090b\] text-gray-300 p-4 font-sans
pb-20"\>

\<div className="max-w-md mx-auto"\>

\<div className="text-center mb-6 pt-4"\>

\<h1 className="text-3xl font-serif font-bold text-gray-200
mb-2"\>Digital Loan\<br/\>Application\</h1\>

\<p className="text-gray-500 text-xs tracking-widest font-bold"\>SECURE
â€¢ FAST â€¢ ENCRYPTED\</p\>

\</div\>

\<form onSubmit={handleSubmit} className="space-y-7"\>

{/\* SEC 1: BASIC & DEMOGRAPHICS \*/}

\<div\>

\<h2 className={headerStyle}\>1. Personal & Demographic Matrix\</h2\>

\<div className={\`grid grid-cols-2 gap-0 \${borderStyle}\`}\>

\<input required placeholder="First Name"
className={\`\${rapidInputStyle} border-r\`} onChange={e =\>
setFormData({...formData, firstName: e.target.value})} /\>

\<input required placeholder="Last Name" className={rapidInputStyle}
onChange={e =\> setFormData({...formData, lastName: e.target.value})}
/\>

{/\* Age/Birthdate Check \*/}

\<input required type="text" placeholder="Birth Date (YYYY-MM-DD)"
className={\`\${rapidInputStyle} border-r text-gray-400\`} onChange={e
=\> calculateAge(e.target.value)} /\>

\<input readOnly placeholder="Age" value={formData.age ? \`Age:
\${formData.age}\` : ""} className={\`\${rapidInputStyle}
text-\[#00df82\]\`} /\>

\<input required placeholder="Phone Number"
className={\`\${rapidInputStyle} col-span-2\`} onChange={e =\>
setFormData({...formData, phone: e.target.value})} /\>

\<input required placeholder="Current Address"
className={\`\${rapidInputStyle} col-span-2 border-b-0\`} onChange={e
=\> setFormData({...formData, address: e.target.value})} /\>

\</div\>

\</div\>

{/\* SEC 2: FINANCIALS & DEEP CI \*/}

\<div\>

\<h2 className={headerStyle}\>2. Financial Interrogation &
Capacity\</h2\>

\<div className={\`grid grid-cols-2 gap-0 \${borderStyle}\`}\>

\<input required placeholder="Employment / Business Name"
className={\`\${rapidInputStyle} col-span-2\`} onChange={e =\>
setFormData({...formData, employment: e.target.value})} /\>

\<input required type="number" placeholder="Gross Income (â‚±)"
className={\`\${rapidInputStyle} col-span-2 text-\[#00df82\]
font-black\`} onChange={e =\> setFormData({...formData, income:
e.target.value})} /\>

{/\* Existing Obligations Disclosure \*/}

\<input placeholder="Existing Loans? (Banks/Apps like Tala)"
className={\`\${rapidInputStyle} col-span-2 text-yellow-500\`}
onChange={e =\> setFormData({...formData, existingLoansDetails:
e.target.value})} /\>

\<input type="number" placeholder="Combined Monthly Amortization (â‚±)"
className={\`\${rapidInputStyle} col-span-2 text-red-400\`} onChange={e
=\> setFormData({...formData, monthlyDebtPayment: e.target.value})} /\>

{/\* Dropdown Selection Conversions ("Checking the box") \*/}

\<div className="col-span-2 p-3 bg-\[#1c1c21\] text-xs font-bold
text-gray-500 uppercase tracking-widest border-b
border-\[#2a2a35\]"\>Living Expenses (Check boxes/Select)\</div\>

\<select defaultValue="1" className={\`\${rapidInputStyle} border-r
text-gray-400\`} onChange={e =\> setFormData({...formData, familySize:
e.target.value})}\>

{\[1,2,3,4,5,"6+"\].map(n =\> \<option key={n} value={n}\>Family Size:
{n}\</option\>)}

\</select\>

\<select defaultValue="1" className={\`\${rapidInputStyle}
text-gray-400\`} onChange={e =\> setFormData({...formData,
workingMembers: e.target.value})}\>

{\[1,2,3,4,"5+"\].map(n =\> \<option key={n} value={n}\>Working Members:
{n}\</option\>)}

\</select\>

\<select defaultValue="0" className={\`\${rapidInputStyle} border-r
text-gray-400\`} onChange={e =\> setFormData({...formData, students:
e.target.value})}\>

{\[0,1,2,3,4,5,"6+"\].map(n =\> \<option key={n} value={n}\>Students:
{n}\</option\>)}

\</select\>

\<select defaultValue="0" className={\`\${rapidInputStyle}
text-gray-400\`} onChange={e =\> setFormData({...formData, infants:
e.target.value})}\>

{\[0,1,2,3,"4+"\].map(n =\> \<option key={n}
value={n}\>Infants/Toddlers: {n}\</option\>)}

\</select\>

\<select className={\`\${rapidInputStyle} border-r text-gray-400\`}
onChange={e =\> setFormData({...formData, housingStatus:
e.target.value})}\>

\<option value="Owned"\>Housing: Owned\</option\>

\<option value="Renting"\>Housing: Renting\</option\>

\<option value="Relatives"\>Housing: Relatives\</option\>

\</select\>

\<input type="number" placeholder="Rent/mo (If Renting)"
className={\`\${rapidInputStyle}\`} onChange={e =\>
setFormData({...formData, rentAmount: e.target.value})} /\>

\<input required type="number" placeholder="Est. Monthly Utility & Food
Bills (â‚±)" className={\`\${rapidInputStyle} col-span-2 text-red-400
border-b-0\`} onChange={e =\> setFormData({...formData, monthlyBills:
e.target.value})} /\>

\</div\>

\</div\>

{/\* SEC 3: RECONNAISSANCE & REFERENCES \*/}

\<div\>

\<h2 className={headerStyle}\>3. Social Recon & References\</h2\>

\<div className={\`grid grid-cols-2 gap-0 \${borderStyle}\`}\>

\<input placeholder="Facebook Profile URL"
className={\`\${rapidInputStyle} col-span-2\`} onChange={e =\>
setFormData({...formData, fbProfileUrl: e.target.value})} /\>

\<input placeholder="Messenger Name / ID"
className={\`\${rapidInputStyle} col-span-2\`} onChange={e =\>
setFormData({...formData, messengerId: e.target.value})} /\>

\<div className="col-span-2 p-3 bg-\[#1c1c21\] text-xs font-bold
text-gray-500 uppercase tracking-widest border-b
border-\[#2a2a35\]"\>Character Reference (Relative/Co-worker)\</div\>

\<input required placeholder="Reference Full Name"
className={\`\${rapidInputStyle} col-span-2\`} onChange={e =\>
setFormData({...formData, referenceName: e.target.value})} /\>

\<input required placeholder="Reference Phone Number"
className={\`\${rapidInputStyle} col-span-2 border-b-0\`} onChange={e
=\> setFormData({...formData, referencePhone: e.target.value})} /\>

\</div\>

\</div\>

{/\* SEC 4: FORENSIC VERIFICATION (Uploads) \*/}

\<div\>

\<h2 className="text-\[#00df82\] font-bold text-lg mb-3 uppercase
tracking-wider"\>4. Forensic Verification Dossier\</h2\>

\<div className={\`\${borderStyle} p-4 space-y-4\`}\>

\<p className={\`text-center text-xs pb-2
\${locStatus.includes('Verified') ? 'text-\[#00df82\]' :
'text-yellow-500'}\`}\>

GPS: {locStatus}

\</p\>

\<div className="grid grid-cols-1 gap-3 text-sm"\>

{\[

{field: 'selfieUrl', label: 'Live Selfie (capture)'},

{field: 'idPhotoUrl', label: 'Valid ID (Required)'},

{field: 'payslipPhotoUrl', label: 'Payment Slip / Payslip (Required)'},

{field: 'electricBillPhotoUrl', label: 'Electricity Bill (Proof of
Address)'},

{field: 'waterBillPhotoUrl', label: 'Water Bill'},

{field: 'collateralUrl', label: 'Collateral Photo'}

\].map(item =\> (

\<div key={item.field} className="bg-\[#1c1c21\] border
border-\[#2a2a35\] rounded-lg p-3"\>

\<label className="block text-gray-400 text-xs mb-1 uppercase
tracking-widest"\>{item.label}\</label\>

\<input type="file" accept="image/\*"

Capture={item.field === 'selfieUrl' ? 'user' : undefined}

Required={\['selfieUrl','idPhotoUrl','payslipPhotoUrl'\].includes(item.field)}

className="w-full text-xs text-gray-500" onChange={e =\> handleImage(e,
item.field)} /\>

\</div\>

))}

\</div\>

\</div\>

\</div\>

\<button type="submit" disabled={status !== ""} className="w-full
bg-\[#00df82\] border border-\[#00df82\]/40 text-\[#09090b\] py-5
font-black text-xs tracking-widest uppercase hover:bg-\[#00df82\]/80
disabled:opacity-50 rounded-xl transition-colors
shadow-\[0_0_20px_rgba(0,223,130,0.15)\]"\>

{status \|\| "SUBMIT FORENSIC DOSSIER"}

\</button\>

\</form\>

\</div\>

\</div\>

);

}

\>\>\> FILE: src/app/apply/actions.ts

"use server";

Import { prisma } from "@/lib/db";

Import { GoogleGenerativeAI } from '@google/generative-ai';

Import { revalidatePath } from 'next/cache';

Export async function submitApplicationRecord(data: any) {

Let score = 5;

Let summary = "AI Analysis Pending";

Try {

Const apiKey = process.env.GEMINI_API_KEY;

If (apiKey) {

Const genAI = new GoogleGenerativeAI(apiKey);

Const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

Const prompt = \`You are an elite Credit Investigator and Risk
Strategist.

Perform a forensic risk analysis on this applicant based on NDI (Net
Disposable Income) and Demographic Stability.

APPLICANT: \${data.firstName} \${data.lastName}

DEMOGRAPHICS: Age \${data.age \|\| 'Unknown'} (DOB: \${data.birthDate
\|\| 'Unknown'})

EMPLOYMENT: \${data.employment}

FINANCIAL DISCLOSURE:

\- Gross Income: PHP \${data.income}

\- Disclosed Existing Loans: \${data.existingLoansDetails \|\| 'None
disclosed'}

\- Stated Monthly Debt Amortization: PHP \${data.monthlyDebtPayment \|\|
0}

LIVING EXPENSES DATA:

\- Family Details: \${data.familySize} members, \${data.workingMembers}
working, \${data.students} students, \${data.infants} infants.

\- Housing: \${data.housingStatus} (Rent: PHP \${data.rentAmount \|\|
0})

\- Stated Monthly Utility/Food Bills: PHP \${data.monthlyBills \|\| 0}

DOCUMENTS RECEIVED CHECK:

\- Selfie: \${data.selfieUrl ? 'RECEIVED âœ"' : 'MISSING'}

\- ID Photo: \${data.idPhotoUrl ? 'RECEIVED âœ"' : 'MISSING'}

\- Payslip: \${data.payslipPhotoUrl ? 'RECEIVED âœ"' : 'MISSING'}

\- Elec Bill: \${data.electricBillPhotoUrl ? 'RECEIVED âœ"' : 'MISSING'}

\- Reference: \${data.referenceName ? 'RECEIVED âœ"' : 'MISSING'}

YOUR TASK:

1\. DEMOGRAPHIC STABILITY: Weigh Age and Family Size.

2\. FORENSIC NDI CALCULATION: Stated Gross Income MINUS (Disclosed Debt
Amortization + Housing + Stated Bills).

3\. CRITICAL EVALUATION: If Monthly Debt + Housing + Bills \> 80% of
Gross Income, REJECT. If Stated Bills seem impossibly low, flag as
'Deceptive Application.'

4\. Assign a forensic Risk Score (1-10) and a summary.

Return ONLY a raw JSON object. Example:

{"score": 7, "summary": "NDI: Gross P25k -- Bills P18k -- Tala P3k = Net
P4k. Payslip present. Moderate Risk."}\`;

Const result = await model.generateContent(prompt);

Let text = result.response.text().trim();

Text = text.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();

Const aiOutput = JSON.parse(text);

If (aiOutput.score) score = aiOutput.score;

If (aiOutput.summary) summary = aiOutput.summary;

}

} catch (aiError: any) {

Summary = \`Forensic Engine Offline: \${aiError.message}\`;

}

Try {

// ðŸ"¥ THE FIX: "as any" blinds TypeScript and forces it to accept our
forensic data!

Await (prisma.application as any).create({

Data: {

firstName: data.firstName,

lastName: data.lastName,

phone: data.phone,

address: data.address,

birthDate: data.birthDate ? data.birthDate ? data.birthDate ? new
Date(data.birthDate) : null : null : null,

age: data.age ? parseInt(data.age) : null,

employment: data.employment,

income: parseFloat(data.income) \|\| 0,

familySize: data.familySize ? parseInt(data.familySize.toString()) : 1,

workingMembers: data.workingMembers ?
parseInt(data.workingMembers.toString()) : 1,

students: data.students ? parseInt(data.students.toString()) : 0,

infants: data.infants ? parseInt(data.infants.toString()) : 0,

housingStatus: data.housingStatus \|\| null,

rentAmount: parseFloat(data.rentAmount) \|\| 0,

monthlyBills: parseFloat(data.monthlyBills) \|\| 0,

existingLoansDetails: data.existingLoansDetails \|\| null,

monthlyDebtPayment: parseFloat(data.monthlyDebtPayment) \|\| 0,

referenceName: data.referenceName \|\| null,

referencePhone: data.referencePhone \|\| null,

fbProfileUrl: data.fbProfileUrl \|\| null,

messengerId: data.messengerId \|\| null,

locationLat: data.locationLat ? parseFloat(data.locationLat) : null,

locationLng: data.locationLng ? parseFloat(data.locationLng) : null,

locationUrl: data.locationUrl \|\| null,

selfieUrl: data.selfieUrl \|\| null,

idPhotoUrl: data.idPhotoUrl \|\| null,

payslipPhotoUrl: data.payslipPhotoUrl \|\| null,

electricBillPhotoUrl: data.electricBillPhotoUrl \|\| null,

waterBillPhotoUrl: data.waterBillPhotoUrl \|\| null,

collateralUrl: data.collateralUrl \|\| null,

credibilityScore: score,

aiRiskSummary: summary

}

});

revalidatePath("/");

return { success: true };

} catch (dbError: any) {

Console.error("Vault Rejection:", dbError);

Return { error: \`DATABASE REJECTION: \${dbError.message}\` };

}

}

// CACHE BUSTER: 1774036020748

\>\>\> FILE: src/app/review/\[id\]/page.tsx

Import { prisma } from "@/lib/db";

Import Link from "next/link";

Import { redirect } from "next/navigation";

Import { revalidatePath } from 'next/cache';

Export default async function ReviewPage(props: { params: Promise\<{ id:
string }\>, searchParams: Promise\<{ error?: string }\> }) {

Const params = await props.params;

Const searchParams = await props.searchParams;

Const appId = params.id;

Const errorMessage = searchParams?.error;

Let app = null;

Try {

Const isNumeric = /\^\\d+\$/.test(appId);

App = await prisma.application.findUnique({

Where: { id: isNumeric ? parseInt(appId) : appId } as any

});

} catch (e: any) {}

If (!app) return \<div className="p-10 text-white font-bold
bg-\[#09090b\] min-h-screen"\>404: Application not found.\</div\>;

Async function processAction(formData: FormData) {

"use server";

Const action = formData.get("action");

Const amount = Number(formData.get("amount"));

Const formAppId = formData.get("appId") as string;

Const isNumeric = /\^\\d+\$/.test(formAppId);

Const parsedId = isNumeric ? parseInt(formAppId) : formAppId;

If (action === "reject") {

Await prisma.application.delete({ where: { id: parsedId } as any });

revalidatePath("/");

redirect("/");

}

If (action === "approve") {

Try {

Const currentApp = await prisma.application.findUnique({ where: { id:
parsedId } as any });

If (!currentApp) return;

Const client = await (prisma as any).client.create({

Data: {

firstName: currentApp.firstName \|\| "Unknown",

lastName: currentApp.lastName \|\| "Unknown"

}

});

Const startDate = new Date();

Const endDate = new Date();

endDate.setDate(startDate.getDate() + 30);

const loan = await (prisma as any).loan.create({

data: {

clientId: client.id,

principal: amount,

interestRate: 20.0,

startDate: startDate,

endDate: endDate

}

});

Await (prisma as any).ledger.create({

Data: {

transactionType: "Loan Disbursement",

amount: amount,

debitAccount: "Loans Receivable",

creditAccount: "Vault Cash",

loanId: loan.id

}

});

Await prisma.application.delete({ where: { id: parsedId } as any });

} catch (error: any) {

Console.error("DISBURSEMENT ERROR:", error);

Redirect(\`/review/\${formAppId}?error=\${encodeURIComponent(error.message)}\`);

}

// ðŸ"¥ THE FIX: Tell Next.js to instantly rebuild the Dashboard with
the new Vault Cash numbers!

revalidatePath("/");

redirect("/");

}

}

Return (

\<div className="min-h-screen bg-\[#09090b\] text-white p-4 pb-20
font-sans"\>

\<div className="flex justify-between items-center mb-6 pt-2"\>

\<Link href="/" className="text-gray-500 font-bold text-sm uppercase
tracking-widest hover:text-white transition-colors"\>â† Back\</Link\>

\<div className={\`w-12 h-12 rounded-xl flex items-center justify-center
font-black text-xl border \${

(app.credibilityScore \|\| 0) \>= 7 ? 'bg-\[#00df82\]/10
text-\[#00df82\] border-\[#00df82\]/30' :

(app.credibilityScore \|\| 0) \>= 4 ? 'bg-yellow-500/10 text-yellow-500
border-yellow-500/30' :

'bg-red-500/10 text-red-500 border-red-500/30'

}\`}\>

{app.credibilityScore \|\| '-'}

\</div\>

\</div\>

\<h1 className="text-3xl font-serif font-bold mb-1"\>{app.firstName}
{app.lastName}\</h1\>

\<p className="text-gray-400 text-sm mb-6"\>{app.employment} â€¢ \<span
className="text-\[#00df82\]
font-bold"\>â‚±{Number(app.income)}/mo\</span\>\</p\>

{errorMessage && (

\<div className="bg-red-500/10 border border-red-500 text-red-500 p-4
rounded-xl mb-6 text-sm font-bold
shadow-\[0_0_15px_rgba(239,68,68,0.2)\]"\>

Âš ï¸ DATABASE REJECTION: {errorMessage}

\</div\>

)}

\<div className="bg-\[#1c1c21\] border border-\[#2a2a35\] p-5
rounded-2xl mb-6 shadow-lg"\>

\<h2 className="text-xs text-gray-500 font-bold uppercase
tracking-widest mb-2 flex items-center gap-2"\>

\<span\>ðŸ§ \</span\> AI Risk Analysis

\</h2\>

\<p className="text-sm italic text-gray-300
leading-relaxed"\>"{app.aiRiskSummary}"\</p\>

\</div\>

\<div className="mb-6 bg-\[#0f0f13\] border border-\[#2a2a35\]
rounded-2xl p-4"\>

\<h2 className="text-xs text-gray-500 font-bold uppercase
tracking-widest mb-3"\>Reconnaissance\</h2\>

\<div className="space-y-3 text-sm"\>

\<div className="flex justify-between border-b border-\[#2a2a35\]
pb-2"\>

\<span className="text-gray-400"\>Facebook:\</span\>

{app.fbProfileUrl ? \<a href={app.fbProfileUrl} target="\_blank"
className="text-blue-500 hover:text-blue-400 underline"\>View
Profile\</a\> : \<span className="text-gray-600"\>None\</span\>}

\</div\>

\<div className="flex justify-between border-b border-\[#2a2a35\]
pb-2"\>

\<span className="text-gray-400"\>Messenger:\</span\>

{app.messengerId ? \<span
className="text-gray-300"\>{app.messengerId}\</span\> : \<span
className="text-gray-600"\>None\</span\>}

\</div\>

\<div className="flex justify-between pt-1"\>

\<span className="text-gray-400"\>GPS Location:\</span\>

{app.locationLat && app.locationLng ?

\<a
href={\`https://www.google.com/maps/search/?api=1&query=\${app.locationLat},\${app.locationLng}\`}
target="\_blank" className="text-\[#00df82\] hover:text-\[#00df82\]/80
underline flex items-center gap-1"\>

ðŸ" Open Map

\</a\>

: \<span className="text-gray-600"\>Bypassed\</span\>}

\</div\>

\</div\>

\</div\>

\<div className="mb-8"\>

\<h2 className="text-xs text-gray-500 font-bold uppercase
tracking-widest mb-3"\>Identity Documents\</h2\>

\<div className="grid grid-cols-2 gap-3"\>

{app.selfieUrl ?

\<img src={app.selfieUrl} className="w-full h-40 object-cover rounded-xl
border border-\[#2a2a35\]" alt="Selfie" /\> :

\<div className="w-full h-40 bg-\[#1c1c21\] rounded-xl flex items-center
justify-center text-xs text-gray-600 border border-\[#2a2a35\]"\>No
Selfie\</div\>

}

{app.idPhotoUrl ?

\<img src={app.idPhotoUrl} className="w-full h-40 object-cover
rounded-xl border border-\[#2a2a35\]" alt="ID" /\> :

\<div className="w-full h-40 bg-\[#1c1c21\] rounded-xl flex items-center
justify-center text-xs text-gray-600 border border-\[#2a2a35\]"\>No
ID\</div\>

}

\</div\>

\</div\>

\<form action={processAction} className="bg-\[#0f0f13\] border
border-\[#00df82\]/40 p-5 rounded-2xl space-y-4
shadow-\[0_0_15px_rgba(0,223,130,0.05)\]"\>

\<h2 className="text-\[#00df82\] font-bold uppercase tracking-widest
text-sm"\>Approve & Fund\</h2\>

\<input type="hidden" name="appId" value={appId} /\>

\<div\>

\<label className="text-xs text-gray-500 font-bold
uppercase"\>Disbursement Amount (â‚±)\</label\>

\<input type="number" name="amount" defaultValue="5000"
className="w-full bg-\[#1c1c21\] border border-\[#2a2a35\] text-white
font-bold p-3 rounded-xl mt-2 outline-none focus:border-\[#00df82\]
transition-colors" required /\>

\</div\>

\<div className="flex gap-3 pt-2"\>

\<button type="submit" name="action" value="approve" className="flex-1
bg-\[#00df82\] text-\[#09090b\] font-black py-4 rounded-xl
hover:bg-\[#00df82\]/80 transition-colors uppercase tracking-widest
text-sm shadow-\[0_0_15px_rgba(0,223,130,0.2)\]"\>

Disburse

\</button\>

\<button type="submit" name="action" value="reject" className="px-5
bg-red-500/10 text-red-500 border border-red-500/30 font-bold rounded-xl
hover:bg-red-500/20 transition-colors text-sm uppercase
tracking-widest"\>

Drop

\</button\>

\</div\>

\</form\>

\</div\>

);

}

\>\>\> FILE: src/app/payments/page.tsx

Import { prisma } from "@/lib/db";

Import Link from "next/link";

Import { revalidatePath } from "next/cache";

Export default async function PaymentsPage() {

// Fetch all active loans to populate the dropdown

Const loans = await prisma.loan.findMany({

Include: { client: true },

orderBy: { id: 'desc' }

});

// ðŸ§ THE PAYMENT ENGINE

Async function processPayment(formData: FormData) {

"use server";

Const loanId = Number(formData.get("loanId"));

Const amount = Number(formData.get("amount"));

If (!loanId \|\| !amount) return;

Try {

// 1. Record the Official Payment Receipt

Const payment = await prisma.payment.create({

Data: {

loanId: loanId,

amount: amount,

paymentDate: new Date()

}

});

// 2. Update the Ledger (Money comes back INTO the Vault Cash)

Await (prisma.ledger as any).create({

Data: {

transactionType: "Loan Repayment",

amount: amount,

debitAccount: "Vault Cash", // Vault Cash goes UP

creditAccount: "Loans Receivable", // Outstanding Loan goes DOWN

loanId: loanId,

paymentId: payment.id

}

});

// 3. Revalidate caches to instantly update the Dashboard

revalidatePath("/");

revalidatePath("/payments");

} catch (error) {

Console.error("PAYMENT ERROR:", error);

}

}

// Fetch recent payments for the audit ledger

Const recentPayments = await prisma.payment.findMany({

Include: { loan: { include: { client: true } } },

orderBy: { paymentDate: 'desc' },

take: 10

});

Return (

\<div className="min-h-screen bg-\[#09090b\] text-white p-4 pb-20
font-sans"\>

\<div className="flex justify-between items-center mb-6 pt-2 border-b
border-\[#2a2a35\] pb-4"\>

\<h1 className="text-2xl font-serif font-bold text-\[#00df82\]"\>Payment
Processing\</h1\>

\<Link href="/" className="text-gray-500 font-bold text-sm uppercase
tracking-widest hover:text-white transition-colors"\>â†
Dashboard\</Link\>

\</div\>

{/\* COLLECTION TERMINAL \*/}

\<form action={processPayment} className="bg-\[#0f0f13\] border
border-\[#00df82\]/40 p-5 rounded-2xl space-y-5 mb-8
shadow-\[0_0_15px_rgba(0,223,130,0.05)\]"\>

\<div\>

\<label className="text-xs text-gray-500 font-bold uppercase mb-2
block"\>Select Active Loan\</label\>

\<select name="loanId" className="w-full bg-\[#1c1c21\] border
border-\[#2a2a35\] text-white p-4 rounded-xl outline-none
focus:border-\[#00df82\]" required\>

\<option value=""\>\-- Choose a Client \--\</option\>

{loans.map(loan =\> (

\<option key={loan.id} value={loan.id}\>

{loan.client.firstName} {loan.client.lastName}
(TXN-{loan.id.toString().padStart(4, '0')})

\</option\>

))}

\</select\>

\</div\>

\<div\>

\<label className="text-xs text-gray-500 font-bold uppercase mb-2
block"\>Payment Amount Received (â‚±)\</label\>

\<input type="number" name="amount" placeholder="e.g. 500"
className="w-full bg-\[#1c1c21\] border border-\[#2a2a35\] text-white
font-black text-xl p-4 rounded-xl outline-none focus:border-\[#00df82\]
transition-colors" required /\>

\</div\>

\<button type="submit" className="w-full bg-\[#00df82\] text-\[#09090b\]
font-black py-4 rounded-xl hover:bg-\[#00df82\]/80 transition-colors
uppercase tracking-widest text-sm
shadow-\[0_0_15px_rgba(0,223,130,0.2)\] mt-2"\>

Process Payment

\</button\>

\</form\>

{/\* RECENT TRANSACTIONS LEDGER \*/}

\<div\>

\<h2 className="text-xs text-gray-500 font-bold uppercase
tracking-widest mb-3"\>Recent Transactions\</h2\>

\<div className="bg-\[#0f0f13\] border border-\[#2a2a35\] rounded-2xl
overflow-hidden"\>

{recentPayments.length === 0 ? (

\<div className="p-5 text-center text-sm text-gray-600 font-bold"\>No
payments recorded yet.\</div\>

) : (

recentPayments.map(pay =\> (

\<div key={pay.id} className="flex justify-between items-center p-4
border-b border-\[#2a2a35\] last:border-0 hover:bg-\[#1c1c21\]
transition-colors"\>

\<div\>

\<div className="font-bold text-gray-200"\>{pay.loan.client.firstName}
{pay.loan.client.lastName}\</div\>

\<div className="text-xs text-gray-500"\>{new
Date(pay.paymentDate).toLocaleDateString()}\</div\>

\</div\>

\<div className="text-\[#00df82\] font-black text-lg"\>

+â‚±{Number(pay.amount)}

\</div\>

\</div\>

))

)}

\</div\>

\</div\>

\</div\>

);

}

\>\>\> FILE: src/lib/prisma.ts

Import { PrismaClient } from '@prisma/client'

Const globalForPrisma = global as unknown as { prisma: PrismaClient }

Export const prisma = globalForPrisma.prisma \|\| new PrismaClient()

If (process.env.NODE_ENV !== 'production') globalForPrisma.prisma =
prisma

Export default prisma

\>\>\> FILE: src/lib/supabase.ts

Import { createClient } from '@supabase/supabase-js';

// Extracted directly from your payload

Const supabaseUrl = 'https://elgtjgrpxnsoibrexixb.supabase.co';

Const supabaseKey =
'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsZ3RqZ3JweG5zb2licmV4aXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTIxMjQsImV4cCI6MjA4OTQyODEyNH0.FTWdgLNsQrEO73YIM4GihUJwV0Y5ro1nMfJbgzD4Ejo';

Export const supabase = createClient(supabaseUrl, supabaseKey);

\>\>\> FILE: src/lib/db.ts

Import { PrismaClient } from "@prisma/client";

Const globalForPrisma = globalThis as unknown as {

Prisma: PrismaClient \| undefined;

};

// This prevents the "Open Handle" infinite freeze during Vercel builds

Export const prisma = globalForPrisma.prisma ?? new PrismaClient();

If (process.env.NODE_ENV !== "production") globalForPrisma.prisma =
prisma;

\>\>\> FILE: src/components/AIChatBox.tsx

"use client";

Import { useState } from "react";

Import { Sparkles, Loader2 } from "lucide-react";

Export default function AIChatBox({ stats }: { stats: any }) {

Const \[input, setInput\] = useState("");

Const \[response, setResponse\] = useState("Matrix Online. I am your
Chief Risk Officer, Financial Strategist, and System Architect. How can
we optimize operations today?");

Const \[isLoading, setIsLoading\] = useState(false);

Const handleSend = async () =\> {

If (!input) return;

setIsLoading(true);

try {

const res = await fetch("/api/chat", {

method: "POST",

headers: { "Content-Type": "application/json" },

body: JSON.stringify({ message: input, stats })

});

Const data = await res.json();

setResponse(data.reply \|\| data.error);

} catch (error) {

setResponse("Critical Error: Connection lost to the AI core.");

}

setIsLoading(false);

setInput("");

};

Return (

\<div className="bg-gradient-to-br from-\[#1a1b2e\] to-\[#1c1c21\]
rounded-2xl p-5 shadow-lg border border-\[#2d2b4a\]"\>

\<h2 className="text-white font-bold mb-2 flex items-center gap-2"\>

\<Sparkles className="text-yellow-400" size={18} /\>

AI Co-Pilot Mentor

\</h2\>

\<div className="bg-\[#0f0f13\] border border-\[#2a2a35\] rounded-lg p-4
mb-4 h-48 overflow-y-auto"\>

\<p className="text-sm text-gray-300 whitespace-pre-wrap
leading-relaxed"\>{response}\</p\>

\</div\>

\<div className="flex gap-2"\>

\<input

Type="text"

Value={input}

onChange={€ =\> setInput(e.target.value)}

onKeyDown={€ =\> e.key === 'Enter' && handleSend()}

placeholder="Consult the AI..."

className="flex-1 bg-\[#0f0f13\] border border-\[#2a2a35\] rounded-lg
px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"

/\>

\<button

onClick={handleSend}

disabled={isLoading}

className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white
font-bold py-2 px-4 rounded-lg text-sm transition-colors flex
items-center justify-center min-w-\[70px\]"

\>

{isLoading ? \<Loader2 size={16} className="animate-spin" /\> : "Send"}

\</button\>

\</div\>

\</div\>

);

}

\>\>\> FILE: src/components/MatrixCopilot.tsx

"use client";

Import { useState } from "react";

Import Mermaid from "./Mermaid";

Export default function MatrixCopilot() {

Const \[response, setResponse\] = useState("Matrix Online. Visual Cortex
shielded. Ask me to map out a strategic forecast or lending
flowchart.");

Const \[loading, setLoading\] = useState(false);

Const handleAsk = async (e: any) =\> {

e.preventDefault();

const prompt = e.target.prompt.value;

if (!prompt) return;

setLoading(true);

setResponse("Generating statistical models and visual node
structures...");

try {

const res = await fetch("/api/matrix", {

method: "POST",

body: JSON.stringify({ prompt })

});

Const data = await res.json();

setResponse(data.reply);

e.target.prompt.value = "";

} catch (err) {

setResponse("Matrix Error: Neural link to database severed.");

}

setLoading(false);

};

Const renderContent = (text: string) =\> {

Const regex = /\`\`\`mermaid(\[\\s\\S\]\*?)\`\`\`/g;

Const parts = \[\];

Let lastIndex = 0;

Let match;

While ((match = regex.exec(text)) !== null) {

If (match.index \> lastIndex) {

Parts.push(\<span key={\`text-\${lastIndex}\`}
dangerouslySetInnerHTML={{ \_\_html: text.slice(lastIndex,
match.index).replace(/\\n/g, '\<br/\>') }} /\>);

}

Parts.push(\<Mermaid key={\`chart-\${match.index}\`}
chart={match\[1\].trim()} /\>);

lastIndex = regex.lastIndex;

}

If (lastIndex \< text.length) {

Parts.push(\<span key={\`text-\${lastIndex}\`}
dangerouslySetInnerHTML={{ \_\_html:
text.slice(lastIndex).replace(/\\n/g, '\<br/\>') }} /\>);

}

Return parts.length \> 0 ? parts : \<span dangerouslySetInnerHTML={{
\_\_html: text.replace(/\\n/g, '\<br/\>') }} /\>;

};

Return (

\<div className="bg-\[#0f0f13\] border border-\[#00df82\]/40 rounded-2xl
p-5 mb-8 shadow-\[0_0_20px_rgba(0,223,130,0.1)\]"\>

\<h2 className="text-\[#00df82\] font-black uppercase tracking-widest
text-sm mb-4 flex items-center gap-2"\>

\<span\>ðŸ§ \</span\> AI Strategic Forecaster

\</h2\>

\<div className="bg-\[#1c1c21\] p-4 rounded-xl text-sm text-gray-300
leading-relaxed mb-4 min-h-\[100px\] border border-\[#2a2a35\]"\>

{renderContent(response)}

\</div\>

\<form onSubmit={handleAsk} className="flex gap-3"\>

\<input

Name="prompt"

Placeholder="e.g. Draw a flowchart for a multi-branch lending strategy."

className="flex-1 bg-\[#09090b\] border border-\[#2a2a35\] rounded-xl
outline-none text-white text-sm p-4 focus:border-\[#00df82\]
transition-colors"

disabled={loading}

required

/\>

\<button

Type="submit"

Disabled={loading}

className="bg-\[#00df82\] text-\[#09090b\] px-6 py-4 rounded-xl
font-black text-xs uppercase tracking-widest hover:bg-\[#00df82\]/80
transition-colors disabled:opacity-50"

\>

Project

\</button\>

\</form\>

\</div\>

);

}

\>\>\> FILE: src/components/Mermaid.tsx

"use client";

Import React, { useEffect, useRef, useState } from 'react';

Export default function Mermaid({ chart }: { chart: string }) {

Const ref = useRef\<HTMLDivElement\>(null);

Const \[hasError, setHasError\] = useState(false);

useEffect(() =\> {

if (!chart \|\| chart.trim() === "") {

setHasError(true);

return;

}

Import('mermaid').then((mermaid) =\> {

Mermaid.default.initialize({

startOnLoad: false,

theme: 'dark',

securityLevel: 'loose',

});

Const id = \`mermaid-\${Math.random().toString(36).substring(2, 10)}\`;

Mermaid.default.parse(chart).then((isValid) =\> {

If (isValid) {

Mermaid.default.render(id, chart).then((result) =\> {

If (ref.current) {

Ref.current.innerHTML = result.svg;

setHasError(false);

}

}).catch(() =\> setHasError(true));

}

}).catch(() =\> setHasError(true));

});

}, \[chart\]);

If (hasError) {

Return (

\<div className="p-3 my-4 bg-yellow-500/10 border border-yellow-500/30
text-yellow-500 text-xs font-bold rounded-xl flex items-center gap-2"\>

Âš ï¸ The AI's visual code was unstable and bypassed to protect the
system.

\</div\>

);

}

Return \<div ref={ref} className="flex justify-center my-4
overflow-x-auto bg-\[#09090b\] p-4 rounded-xl border border-\[#2a2a35\]
min-h-\[50px\]" /\>;

}

\>\>\> FILE: prisma/schema.prisma

Generator client {

Provider = "prisma-client-js"

}

Datasource db {

Provider = "postgresql"

url =
"postgresql://postgres.elgtjgrpxnsoibrexixb:PAby3%217.bXjdkFe@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"

directUrl =
"postgresql://postgres.elgtjgrpxnsoibrexixb:PAby3%217.bXjdkFe@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres"

}

Model Client {

Id Int \@id \@default(autoincrement())

firstName String

lastName String

phone String?

Address String?

createdAt DateTime \@default(now())

loans Loan\[\]

}

Model Loan {

Id Int \@id \@default(autoincrement())

clientId Int

client Client \@relation(fields: \[clientId\], references: \[id\])

principal Decimal

interestRate Decimal

startDate DateTime

endDate DateTime

createdAt DateTime \@default(now())

payments Payment\[\]

ledger Ledger\[\]

}

Model Payment {

Id Int \@id \@default(autoincrement())

loanId Int

loan Loan \@relation(fields: \[loanId\], references: \[id\])

paymentDate DateTime

amount Decimal

ledger Ledger\[\]

}

Model Ledger {

Id Int \@id \@default(autoincrement())

debitAccount String

creditAccount String

amount Decimal

transactionType String

loanId Int?

loan Loan? \@relation(fields: \[loanId\], references: \[id\])

paymentId Int?

payment Payment? \@relation(fields: \[paymentId\], references: \[id\])

createdAt DateTime \@default(now())

}

Model Application {

Id Int \@id \@default(autoincrement())

createdAt DateTime \@default(now())

status String \@default("Pending")

firstName String

lastName String

phone String

address String?

birthDate DateTime?

Age Int?

Employment String

Income Decimal

familySize Int?

workingMembers Int?

students Int?

infants Int?

housingStatus String?

rentAmount Decimal?

monthlyBills Decimal?

existingLoansDetails String?

monthlyDebtPayment Decimal?

referenceName String?

referencePhone String?

fbProfileUrl String?

messengerId String?

locationLat Float?

locationLng Float?

locationUrl String?

selfieUrl String?

idPhotoUrl String?

payslipPhotoUrl String?

electricBillPhotoUrl String?

waterBillPhotoUrl String?

collateralUrl String?

credibilityScore Int

aiRiskSummary String

}

\>\>\> FILE: package.json

{

"name": "fintech-loan-system",

"version": "1.0.0",

"private": true,

"engines": {

"node": "20.x"

},

"scripts": {

"dev": "next dev",

"build": "prisma generate && next build",

"start": "next start",

"postinstall": "prisma generate"

},

"dependencies": {

"@google/generative-ai": "\^0.24.1",

"@prisma/client": "\^5.22.0",

"@supabase/supabase-js": "\^2.99.3",

"clsx": "latest",

"lucide-react": "latest",

"mermaid": "\^11.13.0",

"next": "latest",

"pdf-lib": "\^1.17.1",

"react": "19.0.0",

"react-dom": "19.0.0",

"react-webcam": "\^7.2.0",

"tailwind-merge": "latest"

},

"devDependencies": {

"@tailwindcss/postcss": "latest",

"@types/node": "\^20",

"@types/react": "19.0.0",

"@types/react-dom": "19.0.0",

"autoprefixer": "latest",

"postcss": "latest",

"prisma": "5.22.0",

"tailwindcss": "latest",

"typescript": "\^5"

}

}
