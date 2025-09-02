"use client";
import React from "react";

export type CompanyInfo = {
  name?: string; logoUrl?: string;
  phone?: string; email?: string; website?: string;
  address1?: string; address2?: string; city?: string; state?: string; zip?: string;
  license?: string;
};
export type CustomerInfo = {
  name?: string; company?: string;
  phone?: string; email?: string;
  address1?: string; address2?: string; city?: string; state?: string; zip?: string;
  projectName?: string;
  projectAddress1?: string; projectAddress2?: string; projectCity?: string; projectState?: string; projectZip?: string;
};
export type BidMeta = { bidNo?: string; dateISO?: string; validDays?: number; projectTitle?: string; };

function Inp({ label, value, onChange, type="text" }:{
  label: string; value?: string|number; onChange:(v:string)=>void; type?: string;
}) {
  return (
    <label className="block">
      <div className="text-sm text-slate-600 mb-1">{label}</div>
      <input className="input w-full" type={type} value={value ?? ""} onChange={(e)=>onChange(e.target.value)} />
    </label>
  );
}

export default function BidPartiesForm({
  company, setCompany, customer, setCustomer, meta, setMeta, showMeta=true
}:{
  company: CompanyInfo; setCompany:(c:CompanyInfo)=>void;
  customer: CustomerInfo; setCustomer:(c:CustomerInfo)=>void;
  meta: BidMeta; setMeta:(m:BidMeta)=>void; showMeta?: boolean;
}) {
  return (
    <div className="grid gap-6">
      <div className="rounded-xl border bg-white p-4">
        <div className="font-semibold mb-3">Your Company (the contractor)</div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Inp label="Name" value={company.name} onChange={v=>setCompany({...company,name:v})}/>
          <Inp label="Logo URL" value={company.logoUrl} onChange={v=>setCompany({...company,logoUrl:v})}/>
          <Inp label="Phone" value={company.phone} onChange={v=>setCompany({...company,phone:v})}/>
          <Inp label="Email" value={company.email} onChange={v=>setCompany({...company,email:v})}/>
          <Inp label="Website" value={company.website} onChange={v=>setCompany({...company,website:v})}/>
          <Inp label="License #" value={company.license} onChange={v=>setCompany({...company,license:v})}/>
          <Inp label="Address 1" value={company.address1} onChange={v=>setCompany({...company,address1:v})}/>
          <Inp label="Address 2" value={company.address2} onChange={v=>setCompany({...company,address2:v})}/>
          <Inp label="City" value={company.city} onChange={v=>setCompany({...company,city:v})}/>
          <Inp label="State" value={company.state} onChange={v=>setCompany({...company,state:v})}/>
          <Inp label="Zip" value={company.zip} onChange={v=>setCompany({...company,zip:v})}/>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="font-semibold mb-3">Customer</div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Inp label="Name" value={customer.name} onChange={v=>setCustomer({...customer,name:v})}/>
          <Inp label="Company (optional)" value={customer.company} onChange={v=>setCustomer({...customer,company:v})}/>
          <Inp label="Phone" value={customer.phone} onChange={v=>setCustomer({...customer,phone:v})}/>
          <Inp label="Email" value={customer.email} onChange={v=>setCustomer({...customer,email:v})}/>
          <Inp label="Billing Address 1" value={customer.address1} onChange={v=>setCustomer({...customer,address1:v})}/>
          <Inp label="Billing Address 2" value={customer.address2} onChange={v=>setCustomer({...customer,address2:v})}/>
          <Inp label="City" value={customer.city} onChange={v=>setCustomer({...customer,city:v})}/>
          <Inp label="State" value={customer.state} onChange={v=>setCustomer({...customer,state:v})}/>
          <Inp label="Zip" value={customer.zip} onChange={v=>setCustomer({...customer,zip:v})}/>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="font-semibold mb-3">Project Site</div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Inp label="Project name/label" value={customer.projectName} onChange={v=>setCustomer({...customer,projectName:v})}/>
          <div />
          <Inp label="Site Address 1" value={customer.projectAddress1} onChange={v=>setCustomer({...customer,projectAddress1:v})}/>
          <Inp label="Site Address 2" value={customer.projectAddress2} onChange={v=>setCustomer({...customer,projectAddress2:v})}/>
          <Inp label="City" value={customer.projectCity} onChange={v=>setCustomer({...customer,projectCity:v})}/>
          <Inp label="State" value={customer.projectState} onChange={v=>setCustomer({...customer,projectState:v})}/>
          <Inp label="Zip" value={customer.projectZip} onChange={v=>setCustomer({...customer,projectZip:v})}/>
        </div>
      </div>

      {showMeta && (
        <div className="rounded-xl border bg-white p-4">
          <div className="font-semibold mb-3">Bid Meta</div>
          <div className="grid sm:grid-cols-3 gap-3">
            <Inp label="Bid #" value={meta.bidNo} onChange={v=>setMeta({...meta,bidNo:v})}/>
            <Inp label="Bid date (YYYY-MM-DD)" value={meta.dateISO} onChange={v=>setMeta({...meta,dateISO:v})}/>
            <Inp label="Valid days" value={meta.validDays ?? ""} onChange={v=>setMeta({...meta,validDays:Number(v)||undefined})}/>
            <Inp label="Project Title" value={meta.projectTitle} onChange={v=>setMeta({...meta,projectTitle:v})}/>
          </div>
        </div>
      )}
    </div>
  );
}
