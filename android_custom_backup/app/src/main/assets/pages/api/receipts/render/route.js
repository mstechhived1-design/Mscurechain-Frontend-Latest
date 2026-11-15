"use strict";(()=>{var a={};a.id=7664,a.ids=[7664],a.modules={261:a=>{a.exports=require("next/dist/shared/lib/router/utils/app-paths")},3295:a=>{a.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:a=>{a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},19121:a=>{a.exports=require("next/dist/server/app-render/action-async-storage.external.js")},29294:a=>{a.exports=require("next/dist/server/app-render/work-async-storage.external.js")},33873:a=>{a.exports=require("path")},44870:a=>{a.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},55511:a=>{a.exports=require("crypto")},57198:(a,b,c)=>{c.r(b),c.d(b,{handler:()=>J,patchFetch:()=>I,routeModule:()=>E,serverHooks:()=>H,workAsyncStorage:()=>F,workUnitAsyncStorage:()=>G});var d={};c.r(d),c.d(d,{POST:()=>D});var e=c(95736),f=c(9117),g=c(4044),h=c(39326),i=c(32324),j=c(261),k=c(54290),l=c(85328),m=c(38928),n=c(46595),o=c(3421),p=c(17679),q=c(41681),r=c(63446),s=c(86439),t=c(34679),u=c(51356),v=c(10641),w=c(1371),x=c(29468),y=c(22028);let z=a=>{if(!a)return"";let b=new Date(a);return isNaN(b.getTime())?"":`${String(b.getDate()).padStart(2,"0")}-${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][b.getMonth()]}-${b.getFullYear()} ${String(b.getHours()).padStart(2,"0")}:${String(b.getMinutes()).padStart(2,"0")}`},A=a=>{if(!a)return"-";if("string"==typeof a){let b=a.trim();if(/\([0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?\s*(?:AM|PM|am|pm)?\)/i.test(b))return b;let c=b.match(/^(.*?)\s+([0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?\s*(?:AM|PM|am|pm)?)$/i);if(c)return`${c[1]} (${c[2]})`}try{let b=new Date(a);if(isNaN(b.getTime()))return"string"==typeof a?a:"-";let c=b.getHours(),d=String(b.getMinutes()).padStart(2,"0"),e=c>=12?"PM":"AM";c%=12,c=c||12;let f=String(c).padStart(2,"0");return`${String(b.getDate()).padStart(2,"0")}-${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][b.getMonth()]}-${b.getFullYear()} (${f}:${d} ${e})`}catch{return"string"==typeof a?a:"-"}};function B(a){let b=a.name||"",c=a.address||"",d=a.phone||a.contact||"",e=a.email||"",f=a.logo||"";return`
  <div style="position: relative; width: 100%;" class="main-header-print-container">
    <div style="width: 100%; background-color: #ffffff; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin-bottom: 12px; print-color-adjust: exact; -webkit-print-color-adjust: exact; padding: 0; box-sizing: border-box;">
      <div style="display: flex; align-items: center; justify-content: flex-start; flex-wrap: wrap; gap: 20px; padding: 8px 0; width: 100%; box-sizing: border-box;">
        <div style="flex: 0 0 auto; padding-right: 15px;">
          ${f?`<img src="${f}" alt="Hospital Logo" style="width: 100px; height: 100px; object-fit: contain;" />`:`
          <div style="width: 90px; height: 90px; border: 1.5px solid #1e3a8a; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #1e3a8a; font-size: 10px; font-weight: bold; text-transform: uppercase;">LOGO</div>`}
        </div>
        <div style="width: 2px; height: 70px; background-color: #1e3a8a; opacity: 0.1; display: block;"></div>
        <div style="flex: 1; display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding-left: 5px;">
          ${b?`<h1 style="margin: 0; font-weight: 900; color: #1e3a8a; line-height: 1.1; font-size: 24px; text-transform: uppercase; letter-spacing: -0.5px;">${b}</h1>`:""}
          ${e?`
          <div style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: #0284c7; font-weight: 700; margin-top: 2px;">
            <div style="width: 14px; height: 14px; background-color: #1e3a8a; border-radius: 2px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            </div>
            <span>${e}</span>
          </div>`:""}
          <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 12px; font-size: 12px; color: #475569; font-weight: 600; margin-top: 2px; width: 100%;">
            ${c?`<span style="color: #64748b;">${c}</span>`:""}
            ${d?`
            <div style="display: flex; align-items: center; gap: 6px; margin-left: ${c?"8px":"0"};">
              <div style="width: 16px; height: 16px; background-color: #22c55e; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              </div>
              <span style="color: #16a34a; font-weight: 800;">${d}</span>
            </div>`:""}
          </div>
        </div>
      </div>
      <div style="width: 100%; height: 4px; background-color: #10b981; margin-top: 10px; border-radius: 2px;"></div>
    </div>
  </div>`}function C(a){let b=a.name||"",c=a.address||"",d=a.phone||a.contact||"",e=a.email||"";return`
  <div style="width: 100%; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; print-color-adjust: exact; -webkit-print-color-adjust: exact; margin-top: 20px;">
    <div style="width: 100%; height: 3px; background-color: #10b981; border-radius: 2px; margin-bottom: 6px;"></div>
    <div style="display: flex; flex-wrap: wrap; align-items: stretch; gap: 6px; margin-bottom: 6px;">
      ${d?`
      <div style="flex: 1; background: #22c55e; color: #ffffff; display: flex; align-items: center; justify-content: center; padding: 6px 14px; border-radius: 6px; font-weight: 900; font-size: 12px; letter-spacing: 0.5px; gap: 6px;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        ${d}
      </div>`:""}
      ${e?`
      <div style="flex: 2; background: #1e3a8a; color: #ffffff; display: flex; align-items: center; justify-content: center; padding: 6px 14px; border-radius: 6px; font-weight: 700; font-size: 11px; gap: 6px;">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
        ${e}
      </div>`:""}
    </div>
    ${c?`
    <div style="text-align: center; font-size: 9px; color: #64748b; font-weight: 500; line-height: 1.4; padding-bottom: 4px;">
      ${b?`<span style="font-weight: 700; color: #1e3a8a;">${b} &mdash; </span>`:""}${c}
    </div>`:""}
  </div>`}async function D(a){try{let{type:b,data:c}=await a.json()||{};if(!b||!c)return v.NextResponse.json({success:!1,error:"Both 'type' and 'data' payload are required"},{status:400});let d="",e="Hospital Document",f=`${b}_${c._id||Date.now()}.pdf`,g="Official Hospital Record",h=("object"!=typeof c.hospital||null===c.hospital||Array.isArray(c.hospital)?null:c.hospital)||("object"!=typeof c.appointment?.hospital||c.appointment?.hospital===null||Array.isArray(c.appointment?.hospital)?null:c.appointment.hospital)||{},i=("object"!=typeof c.patientDetails||null===c.patientDetails||Array.isArray(c.patientDetails)?null:c.patientDetails)||("object"!=typeof c.appointment?.patientDetails||c.appointment?.patientDetails===null||Array.isArray(c.appointment?.patientDetails)?null:c.appointment.patientDetails)||{},j=("object"!=typeof c.patient||null===c.patient||Array.isArray(c.patient)?null:c.patient)||("object"!=typeof c.appointment?.patient||c.appointment?.patient===null||Array.isArray(c.appointment?.patient)?null:c.appointment.patient)||i||{},k=("object"!=typeof c.doctor||null===c.doctor||Array.isArray(c.doctor)?null:c.doctor)||("object"!=typeof c.appointment?.doctor||c.appointment?.doctor===null||Array.isArray(c.appointment?.doctor)?null:c.appointment.doctor)||{},l=c.honorific||c.appointmentHonorific||j.honorific||j.profile?.honorific||i.honorific||c.patientDetails?.honorific||"",m=i.name||j.name||j.fullName||j.user?.name||c.patientName||c.customerName||"";(m.toUpperCase().includes("UNNAMED")||m.toUpperCase().includes("UNKNOWN"))&&((m=i.name||j.name||c.patientName||c.customerName||"").toUpperCase().includes("UNNAMED")||m.toUpperCase().includes("UNKNOWN"))&&(m="");let n=m.trim();if(l&&n&&!n.toLowerCase().startsWith(l.toLowerCase())){let a=l.trim();n=`${a} ${n}`}let o=j.mrn||j.profile?.mrn||j.medicalRecordNumber||j.uhid||c.mrn||c.patientMRN||c.appointment?.mrn||"",p=j.mobile||j.phone||j.contactNumber||j.user?.mobile||i.guardianMobile||c.customerPhone||c.mobile||c.phone||"",q=j.address||j.profile?.address||j.user?.address||c.patientAddress||c.address||"",r=j.dateOfBirth||j.dob||j.profile?.dob||j.user?.dateOfBirth||c.dob||c.dateOfBirth||"",s=j.gender||j.profile?.gender||i.gender||c.gender||"",t=j.age||j.profile?.age||i.age||c.age||"",u=k.name||k.user?.name||c.doctorName||"";if("prescription"===b){let a={..."object"==typeof c.prescription&&null!==c.prescription?c.prescription:{},...c,medicines:c.medicines||c.prescription&&c.prescription.medicines||[],diagnosis:c.diagnosis||c.prescription&&c.prescription.diagnosis||c.provisionalDiagnosis||c.symptoms||c.reason||""};d=(0,w.z6)({hospital:h,patient:{...j,name:n,honorific:l,mrn:o,mobile:p,address:q,dob:r,gender:s,age:t},doctor:{...k,name:u},prescription:a,appointment:c.appointment||a.appointment||c,headerHtml:B(h),footerHtml:C(h)}),e=`Prescription - ${n||"Patient"}`,f=`Prescription_${c._id||o||"record"}.pdf`,g=`*${(h.name||"HOSPITAL").toUpperCase()}*
━━━━━━━━━━━━━━━━━━
*DOCTOR PRESCRIPTION*

*Patient:* ${n}
*Doctor:* ${u}
*Date:* ${c.prescriptionDate||a.prescriptionDate||""}
━━━━━━━━━━━━━━━━━━
• Official signed prescription attached.`}else if("appointment"===b||"consultation"===b){let a=c.appointment||c,b=c.amount??a.amount??a.consultationFee??a.fee??0,i="number"!=typeof b||isNaN(b)?parseFloat(String(b).replace(/[^0-9.]/g,""))||0:b,l=c.paymentMethod||a.paymentMethod||"UPI",m=/razorpay|online/i.test(l)?"UPI":l,v=c.payment||a.payment||{amount:i,status:c.paymentStatus||a.paymentStatus||"PAID",mode:m,method:m},x=c.token_number||c.tokenNo||c.tokenNumber||a.token_number||a.tokenNo||a.tokenNumber||"",y=c.symptoms||a.symptoms||c.reason||a.reason||c.chiefComplaint||a.chiefComplaint||"",z=B(h),A=C(h);d=(0,w.DF)({hospital:{...h,name:h.name||"",address:h.address||"",contact:h.contact||h.phone||"",phone:h.phone||h.contact||"",email:h.email||"",opdFollowUpDays:h.opdFollowUpDays??7,enableFollowUpExpiry:h.enableFollowUpExpiry??!0},patient:{...j,name:n,mrn:o,mobile:p,address:q,dob:r,gender:s,age:t},doctor:{...k,name:u},appointment:{...a,doctorName:u,token_number:x,tokenNo:x,tokenNumber:x,symptoms:y,type:a.type||"offline",visitType:"OPD",followUpStatus:a.followUpStatus||{doctorVisitCount:1},appointmentId:c.appointmentId||a.appointmentId||c._id||"",date:a.date||c.date||"",appointmentTime:a.appointmentTime||a.startTime||a.time||""},payment:{...v,amount:v.amount??0,mode:v.mode||v.paymentMethod||"UPI",method:v.mode||v.paymentMethod||"UPI",status:v.status||v.paymentStatus||"PAID"},registrationType:"OPD",headerHtml:z,footerHtml:A,printWithHeader:!0,showGuardianDetails:!1}),e=`Appointment Receipt - ${n||"Patient"}`,f=`AppointmentReceipt_${c.appointmentId||c._id||"receipt"}.pdf`,g=`*${(h.name||"HOSPITAL").toUpperCase()}*
━━━━━━━━━━━━━━━━━━
*OPD CONSULTATION RECEIPT*

*Patient:* ${n}
*Doctor:* ${u}
*Token No:* #${x}
*Amount:* ₹${v.amount} (${String(v.status).toUpperCase()})
━━━━━━━━━━━━━━━━━━
• Show this receipt at hospital frontdesk.`}else if("lab-token"===b)d=(0,w.rm)({hospital:h,patient:{...j,name:n,mrn:o},doctor:{...k,name:u},appointment:c.appointment||c,tests:c.tests||c.testNames||[],token:c.tokenNumber||c.tokenNo||c._id,sampleId:c.sampleId||c._id}),e=`Lab Token - ${n||"Patient"}`,f=`LabToken_${c._id||"token"}.pdf`,g=`*${(h.name||"HOSPITAL").toUpperCase()}*
━━━━━━━━━━━━━━━━━━
*LAB PHLEBOTOMY TOKEN*

*Patient:* ${n}
*Token No:* #${c.tokenNumber||""}
━━━━━━━━━━━━━━━━━━
• Sample collection counter slip.`;else if("lab-invoice"===b||"lab-bill"===b){let a=c.payment||{amount:c.amount||c.totalAmount||0,status:c.paymentStatus||"PAID",mode:c.paymentMethod||"CASH"},b=[];Array.isArray(c.items)&&c.items.length>0?b=c.items:Array.isArray(c.tests)&&c.tests.length>0?b=c.tests:(c.testName||c.name)&&(b=[{testName:c.testName||c.name,price:a.amount||0}]);let i=Number(c.totalAmount??c.amount??a.amount??b.reduce((a,b)=>a+(Number(b.price)||0),0)),l=Number(c.discount||a.discount||0),m=Number(c.paidAmount??a.amount??i),o=Number(c.balance??(i-l-m>0?i-l-m:0)),p=c.paymentMode||a.mode||c.paymentMethod||"Cash",q=c.invoiceId||c.invoiceNo||(c.tokenNumber?`OPD-${c.tokenNumber}`:`OPD-HHO${(c._id||"").slice(-6).toUpperCase()}`),r=c.date||c.createdAt||c.billDate||new Date,s=(0,w.Dd)(r)||new Date,t=s.toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}),v=s.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:!0}),x=j.age||c.patientDetails?.age||"-",y=j.ageUnit||c.patientDetails?.ageUnit||"Years",z=j.gender||c.patientDetails?.gender||"-",A=`${"-"!==x?`${x} ${y}`:"-"} / ${z}`,B=j.mobile||c.patientDetails?.mobile||c.patientDetails?.phone||"-",C=j.mrn||c.patientDetails?.mrn||c.mrn||"N/A",D=n||j.name||c.patientDetails?.name||"Patient",E=u||k.name||c.doctor?.name||c.refDoctor||"",F=c.labInfo?.name||(h.name?h.name.toUpperCase().includes("LAB")?h.name.toUpperCase():`${h.name.toUpperCase()} LABORATORY`:"LABORATORY"),G=c.labInfo?.address||h.address||"",H=c.labInfo?.phone||h.phone||h.contact||"",I=c.labInfo?.email||h.email||"",J=c.labInfo?.logo||h.logo||"",K=b.length>0?b.map((a,c)=>{let d=a.testName||a.name||a.test?.testName||"Diagnostic Test",e=Number(a.price??a.cost??(1===b.length?i:0));return`
            <tr>
              <td style="border: 1px solid #000000; padding: 6px 10px; text-align: left; width: 60px;">${c+1}</td>
              <td style="border: 1px solid #000000; padding: 6px 10px; text-align: left; font-weight: 500;">${d}</td>
              <td style="border: 1px solid #000000; padding: 6px 10px; text-align: right; width: 120px; font-weight: 700;">₹${e.toFixed(2)}</td>
            </tr>`}).join(""):'<tr><td colspan="3" style="border: 1px solid #000000; padding: 12px; text-align: center;">No tests recorded on this invoice</td></tr>';d=`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>OPD Invoice - ${q}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    @page { size: A4 portrait; margin: 8mm 12mm; }
    html, body {
      margin: 0;
      padding: 0;
      height: 100%;
      background-color: #ffffff;
      color: #000000;
      font-family: 'Inter', Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .bill-wrapper {
      width: 100%;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #ffffff;
      min-height: 100%;
      min-height: 100vh;
    }
    table { border-collapse: collapse; }
    th, td { box-sizing: border-box; }
  </style>
</head>
<body>
  <div class="bill-wrapper">
    <div>
      <!-- HeaderPrint Component matching Screenshot 3 -->
      <div style="width: 100%; font-family: 'Inter', Arial, sans-serif; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 20px; padding: 6px 0 10px 0;">
          ${J?`
          <div style="width: 110px; max-height: 80px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <img src="${J}" alt="Lab Logo" style="max-width: 100%; max-height: 80px; object-fit: contain;" />
          </div>`:`
          <div style="width: 85px; height: 70px; border: 1.5px solid #1e3a8a; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #1e3a8a; font-size: 11px; font-weight: bold; text-transform: uppercase; flex-shrink: 0;">
            LOGO
          </div>`}
          <div style="width: 2px; height: 60px; background-color: #cbd5e1; flex-shrink: 0;"></div>
          <div style="flex: 1; display: flex; flex-direction: column; align-items: flex-start; gap: 2px;">
            <h1 style="margin: 0; font-size: 26px; font-weight: 900; color: #1e3a8a; text-transform: uppercase; letter-spacing: -0.5px; line-height: 1.1;">
              ${F}
            </h1>
            <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #1e3a8a; font-weight: 700; margin-top: 2px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" stroke-width="2.5"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              <span>${I}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px; font-size: 11px; color: #475569; font-weight: 600; margin-top: 2px; flex-wrap: wrap;">
              <span>${G}</span>
              <span style="color: #cbd5e1;">|</span>
              <div style="display: flex; align-items: center; gap: 5px; color: #15803d; font-weight: 700;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#15803d" stroke="none"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                <span>${H}</span>
              </div>
            </div>
          </div>
        </div>
        <div style="width: 100%; height: 4px; background-color: #15803d; border-radius: 2px;"></div>
      </div>

      <!-- Center Title: OPD INVOICE matching Screenshot 3 -->
      <div style="display: flex; justify-content: center; align-items: center; margin-bottom: 12px; position: relative; width: 100%;">
        <div style="width: 100%; border-top: 1px solid #000000; position: absolute; top: 11px; left: 0; z-index: 1;"></div>
        <span style="position: relative; z-index: 2; background-color: #ffffff; padding: 0 16px; font-weight: 800; font-size: 14px; text-transform: uppercase; color: #000000; border-bottom: 2px solid #000000; padding-bottom: 2px;">
          OPD INVOICE
        </span>
      </div>

      <!-- Info Grid Box (Border 1px solid #000) matching Screenshot 3 -->
      <table style="width: 100%; border: 1px solid #000000; border-collapse: collapse; margin-bottom: 10px;">
        <tr>
          <!-- Invoice Info (Left) -->
          <td style="width: 50%; vertical-align: top; padding: 8px 12px; border-right: 1px solid #000000;">
            <div style="font-weight: 800; font-size: 11px; text-transform: uppercase; margin-bottom: 8px; color: #000000;">INVOICE INFORMATION</div>
            <table style="width: 100%; font-size: 11px; line-height: 1.5;">
              <tr>
                <td style="width: 85px; font-weight: 600; color: #000000;">Invoice ID:</td>
                <td style="color: #000000; font-weight: 700;">${q}</td>
              </tr>
              <tr>
                <td style="width: 85px; font-weight: 600; color: #000000;">Date:</td>
                <td style="color: #000000;">${t}</td>
              </tr>
            </table>
          </td>

          <!-- Patient Info (Right) -->
          <td style="width: 50%; vertical-align: top; padding: 8px 12px;">
            <div style="font-weight: 800; font-size: 11px; text-transform: uppercase; margin-bottom: 8px; color: #000000;">PATIENT INFORMATION</div>
            <table style="width: 100%; font-size: 11px; line-height: 1.5;">
              <tr>
                <td style="width: 95px; font-weight: 600; color: #000000;">Name:</td>
                <td style="color: #000000; font-weight: 700;">${D}</td>
              </tr>
              <tr>
                <td style="width: 95px; font-weight: 600; color: #000000;">MRN:</td>
                <td style="color: #000000; font-weight: 700;">${C}</td>
              </tr>
              <tr>
                <td style="width: 95px; font-weight: 600; color: #000000;">Age / Gender:</td>
                <td style="color: #000000;">${A}</td>
              </tr>
              <tr>
                <td style="width: 95px; font-weight: 600; color: #000000;">Mobile:</td>
                <td style="color: #000000;">${B}</td>
              </tr>
              <tr>
                <td style="width: 95px; font-weight: 600; color: #000000;">Ref. Doctor:</td>
                <td style="color: #000000;">${E}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Items Table matching Screenshot 3 -->
      <table style="width: 100%; border: 1px solid #000000; border-collapse: collapse; margin-bottom: 12px; font-size: 11px;">
        <thead>
          <tr style="background-color: #e5e7eb; color: #000000;">
            <th style="border: 1px solid #000000; padding: 5px 8px; text-align: left; width: 55px; font-weight: 700;">S.No</th>
            <th style="border: 1px solid #000000; padding: 5px 8px; text-align: left; font-weight: 700;">Test / Service</th>
            <th style="border: 1px solid #000000; padding: 5px 8px; text-align: right; width: 110px; font-weight: 700;">Price (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${K}
        </tbody>
      </table>

      <!-- Summary / Totals Section (2 Columns matching hospital portal exactly) -->
      <table style="width: 100%; border-collapse: separate; border-spacing: 12px 0; margin-bottom: 14px;">
        <tr>
          <!-- Left: Payment Summary (4 rows matching hospital portal) -->
          <td style="width: 50%; vertical-align: top; padding: 0;">
            <table style="width: 100%; border: 1px solid #000000; border-collapse: collapse; font-size: 11px;">
              <tr>
                <td style="padding: 6px 10px; font-weight: 700; color: #000000; border-bottom: 1px solid #000000;">Payment Mode:</td>
                <td style="padding: 6px 10px; text-align: right; border-bottom: 1px solid #000000;">${p}</td>
              </tr>
              <tr>
                <td style="padding: 6px 10px; font-weight: 700; color: #000000; border-bottom: 1px solid #000000;">Payment Status:</td>
                <td style="padding: 6px 10px; text-align: right; font-weight: 700; color: #000000; border-bottom: 1px solid #000000;">${o>0?"Partially Paid":"Fully Paid"}</td>
              </tr>
              <tr>
                <td style="padding: 6px 10px; font-weight: 700; color: #000000; border-bottom: 1px solid #000000;">Bill Date:</td>
                <td style="padding: 6px 10px; text-align: right; border-bottom: 1px solid #000000;">${t}</td>
              </tr>
              <tr style="background-color: #e5e7eb;">
                <td style="padding: 6px 10px; font-weight: 700; color: #000000;">Bill Time:</td>
                <td style="padding: 6px 10px; text-align: right; color: #000000; font-weight: 600;">${v}</td>
              </tr>
            </table>
          </td>

          <!-- Right: Totals Box (2 rows matching hospital portal) -->
          <td style="width: 50%; vertical-align: top; padding: 0;">
            <table style="width: 100%; border: 1px solid #000000; border-collapse: collapse; font-size: 11px;">
              <tr>
                <td style="padding: 6px 10px; font-weight: 700; color: #000000; border-bottom: 1px solid #000000;">Total Amount:</td>
                <td style="padding: 6px 10px; text-align: right; font-weight: 700; border-bottom: 1px solid #000000;">₹${i.toFixed(2)}</td>
              </tr>
              <tr style="background-color: #e5e7eb;">
                <td style="padding: 6px 10px; font-weight: 700; color: #000000;">Balance Due:</td>
                <td style="padding: 6px 10px; text-align: right; font-weight: 700; color: #000000;">₹${o.toFixed(2)}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>

    <!-- FooterPrint Component matching Screenshot 3 -->
    <div style="margin-top: auto; padding-top: 10px; page-break-inside: avoid;">
      <!-- Green & Blue Contact Banner Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px; table-layout: fixed;">
        <tr>
          <!-- Green Phone Side (50%) -->
          <td style="width: 50%; background-color: #15803d; color: #ffffff; padding: 6px 14px; font-size: 11px; font-weight: 700; vertical-align: middle;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="white" stroke="none"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              <span>${H}</span>
            </div>
          </td>
          <!-- Blue Email Side (50%) -->
          <td style="width: 50%; background-color: #1e3a8a; color: #ffffff; padding: 6px 14px; font-size: 11px; font-weight: 700; vertical-align: middle; text-align: right;">
            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px;">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              <span>${I}</span>
            </div>
          </td>
        </tr>
      </table>

      <!-- Bottom Disclaimers & Address matching Screenshot 3 -->
      <table style="width: 100%; border-collapse: collapse; font-size: 8px; color: #1e3a8a; line-height: 1.3;">
        <tr>
          <td style="vertical-align: top; width: 60%; color: #0284c7; font-weight: 500;">
            <div>• Results clinically correlation recommended</div>
            <div>• Contact lab immediately for alarming results</div>
            <div>• Not for medico-legal purpose</div>
            <div>• (*) Tests are not NABL accredited</div>
          </td>
          <td style="vertical-align: top; width: 40%; text-align: right; color: #475569; font-weight: 500;">
            ${G}
          </td>
        </tr>
      </table>
    </div>
  </div>
</body>
</html>`,e=`Lab Invoice - ${D||"Patient"}`,f=`LabInvoice_${q}.pdf`,g=`*${F}*
━━━━━━━━━━━━━━━━━━
*OPD LAB INVOICE*

*Patient:* ${D}
*Invoice #:* ${q}
*Amount:* ₹${i}
━━━━━━━━━━━━━━━━━━
• Diagnostic lab invoice attached.`}else if("lab-report"===b){let a=c.tests||c.labSample&&c.labSample.tests||c.report&&c.report.tests||c.results||[],b={sampleId:c.sampleId||c.tokenNumber||c.tokenNo||c.labSample&&c.labSample.sampleId||`SMP-${(c._id||"").slice(-6).toUpperCase()}`,sampleType:c.sampleType||c.specimen||c.labSample&&c.labSample.sampleType||"Blood",reportDate:c.reportDate||c.labSample&&c.labSample.reportDate||c.createdAt||new Date().toISOString(),collectionDate:c.collectionDate||c.labSample&&c.labSample.collectionDate||c.collectedAt||c.createdAt||new Date().toISOString(),status:c.status||c.labSample&&c.labSample.status||"Completed",tests:a};d=(0,w.qD)({hospital:h,labInfo:c.labInfo,labSettings:c.labSettings,patient:{...j,name:n,honorific:l,mrn:o,mobile:p,address:q,dob:r,gender:s,age:t},doctor:{...k,name:u},labSample:b,headerHtml:B(h),footerHtml:C(h)}),e=`Lab Report - ${c.testName||"Investigation"}`,f=`LabReport_${c._id||"report"}.pdf`,g=`*${(h.name||"HOSPITAL").toUpperCase()}*
━━━━━━━━━━━━━━━━━━
*PATHOLOGY INVESTIGATION REPORT*

*Patient:* ${n}
*Test:* ${c.testName||"Investigation"}
━━━━━━━━━━━━━━━━━━
• Official signed lab report.`}else if("pharmacy"===b||"pharmacy-invoice"===b){let a=c.invoiceNo||c.invoiceId||c.tokenNumber||`PH-${(c._id||"").slice(-6).toUpperCase()}`,b=c.createdAt||c.billDate||c.prescriptionDate||c.date||new Date().toISOString(),i=new Date(b).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}),j=new Date(b).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:!0}),k=c.paymentSummary?.paymentMode||c.mode||c.paymentMethod||c.paymentMode||"Cash",l=c.items||c.medicines||[],m=c.paymentSummary?.subtotal??c.subTotal??l.reduce((a,b)=>a+(Number(b.amount||b.total||(b.qty||b.quantity||1)*(b.mrp||b.rate||b.unitRate||0))||0),0),r=c.paymentSummary?.discount??c.discountTotal??l.reduce((a,b)=>a+(Number(b.discountValue||b.discount||0)||0),0),s=c.paymentSummary?.grandTotal??c.netPayable??c.totalAmount??m-r,t=c.paymentSummary?.paidAmount??c.paid??s,v=c.paymentSummary?.balanceDue??c.balance??0,w=c.paymentSummary?.taxableAmount??m-r-(c.taxTotal||0),x=new Map;l.forEach(a=>{let b=a.qty||a.quantity||1,c=a.mrp||a.rate||a.unitRate||0,d=a.amount||a.total||b*c,e=m>0?d/m:0,f=r*e,g=d-f,h=Number(a.gstPct||a.gst||0);if(h>0){let a=g-g/(1+h/100);x.set(h,(x.get(h)||0)+a)}});let y=Array.from(x.entries()).sort((a,b)=>a[0]-b[0]).map(([a,b])=>`
            <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 600; color: #64748b; padding: 1px 0;">
              <span>GST @${a}%:</span>
              <span style="color: #6366f1; font-weight: 700;">₹${b.toFixed(2)}</span>
            </div>`).join(""),z=l.length>0?l.map((a,b)=>{let c=a.productName||a.medicineName||a.name||a.item||"Medicine",d=a.qty||a.quantity||1,e=Number(a.mrp||a.rate||a.unitRate||0),f=Number(a.discountPct||a.discountValue||a.discount||0),g=Number(a.gstPct||a.gst||12),h=Number(a.amount||a.total||d*e),i=a.expiryDate||a.exp||a.expiry||"-";if(i&&"-"!==i)try{i=new Date(i).toLocaleDateString("en-GB",{month:"2-digit",year:"2-digit"})}catch(a){}return`
                <tr>
                  <td style="padding: 8px 6px; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; text-align: center; font-size: 10px;">${b+1}</td>
                  <td style="padding: 8px 6px; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; text-align: left; font-size: 10px; font-weight: 600;">
                    <div style="font-weight: 800; color: #1e293b;">${c}</div>
                    ${a.frequency?`<div style="font-size: 7px; color: #64748b; font-weight: 600; margin-top: 2px; font-style: italic;">Freq: ${"object"==typeof a.frequency?"As Prescribed":a.frequency}</div>`:""}
                  </td>
                  <td style="padding: 8px 6px; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; text-align: center; font-size: 10px;">${i}</td>
                  <td style="padding: 8px 6px; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; text-align: center; font-size: 10px; font-weight: 700;">${d}</td>
                  <td style="padding: 8px 6px; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; text-align: center; font-size: 10px;">₹${e.toFixed(2)}</td>
                  <td style="padding: 8px 6px; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; text-align: center; font-size: 10px;">${f}%</td>
                  <td style="padding: 8px 6px; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; text-align: center; font-size: 10px;">${g}%</td>
                  <td style="padding: 8px 6px; border-bottom: 1px solid #cbd5e1; text-align: right; font-size: 10px; font-weight: 800; color: #1e293b;">₹${h.toFixed(2)}</td>
                </tr>`}).join(""):'<tr><td colspan="8" style="text-align: center; padding: 20px; color: #64748b;">No items recorded on this invoice</td></tr>',A="#112d42",D="#cbd5e1",E="#1e293b",F="#64748b",G=B(h),H=C(h);d=`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Pharmacy Tax Invoice - ${a}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
    @page { size: A4 portrait; margin: 0; }
    html, body {
      margin: 0;
      padding: 0;
      background-color: #ffffff;
      color: ${E};
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .invoice-wrapper {
      width: 100%;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      background: #ffffff;
    }
  </style>
</head>
<body>
  <div class="invoice-wrapper">
    <!-- Main Hospital Header matching Appointment Slip -->
    ${G}

    <div style="width: 100%; display: flex; flex-direction: column;">
      <!-- Invoice Metadata & Bill To details on the same row -->
      <div style="display: flex; justify-content: space-between; gap: 20px; margin-bottom: 20px; margin-top: 10px; align-items: stretch; width: 100%;">
        <!-- Bill To Section -->
        <div style="flex: 1; border: 1px solid ${D}; border-radius: 4px; overflow: hidden;">
          <div style="background-color: ${A}; color: white; padding: 4px 15px; font-size: 10px; font-weight: 800; text-transform: uppercase; width: fit-content;">BILL TO</div>
          <div style="padding: 10px 15px;">
            <h3 style="font-size: 15px; font-weight: 800; color: #000; margin: 0 0 5px 0;">${n||"PATIENT"}</h3>
            <div style="font-size: 10px; color: ${F}; font-weight: 500; display: flex; flex-direction: column; gap: 2px;">
              ${p?`<span>📞 +91 ${p}</span>`:""}
              <span>📍 ${q||h.address||"Karnataka, India"}</span>
              <div style="display: flex; gap: 15px; margin-top: 2px;">
                ${o?`<span style="font-weight: 600;">MRN: <span style="font-weight: 800;">${o}</span></span>`:""}
                <span style="font-weight: 600;">Type: <span style="font-weight: 800;">OPD</span></span>
              </div>
              <span style="margin-top: 4px; font-weight: 800; color: ${E};">Doctor: <span style="font-weight: 500;">${u||"Self / Walk-in"}</span></span>
            </div>
          </div>
        </div>

        <!-- Tax Invoice Details Box -->
        <div style="width: 250px; flex-shrink: 0; border: 1.5px solid ${A}; border-radius: 4px; overflow: hidden;">
          <div style="background-color: ${A}; color: white; text-align: center; padding: 5px 0; font-weight: 800; font-size: 12px; text-transform: uppercase;">TAX INVOICE</div>
          <div style="padding: 6px 10px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 10px;">
              <span style="color: ${F}; font-weight: 500;">Invoice No:</span>
              <span style="font-weight: 700; color: ${E};">${a}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 10px;">
              <span style="color: ${F}; font-weight: 500;">Invoice Date:</span>
              <span style="font-weight: 700; color: ${E};">${i}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 10px;">
              <span style="color: ${F}; font-weight: 500;">Invoice Time:</span>
              <span style="font-weight: 700; color: ${E};">${j}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 10px;">
              <span style="color: ${F}; font-weight: 500;">Payment Mode:</span>
              <span style="font-weight: 700; color: ${E};">${k}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 10px;">
              <span style="color: ${F}; font-weight: 500;">Status:</span>
              <span style="font-weight: 800; color: #16a34a;">PAID</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Itemized Medicines Table -->
      <table style="width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 16px; border: 1px solid ${D};">
        <thead>
          <tr>
            <th style="background-color: ${A}; color: white; padding: 7px 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; border-right: 1px solid rgba(255,255,255,0.2); width: 35px; text-align: center;">S.NO</th>
            <th style="background-color: ${A}; color: white; padding: 7px 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; border-right: 1px solid rgba(255,255,255,0.2); text-align: left;">ITEM NAME</th>
            <th style="background-color: ${A}; color: white; padding: 7px 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; border-right: 1px solid rgba(255,255,255,0.2); width: 65px; text-align: center;">EXPIRY</th>
            <th style="background-color: ${A}; color: white; padding: 7px 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; border-right: 1px solid rgba(255,255,255,0.2); width: 45px; text-align: center;">QTY</th>
            <th style="background-color: ${A}; color: white; padding: 7px 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; border-right: 1px solid rgba(255,255,255,0.2); width: 65px; text-align: center;">MRP</th>
            <th style="background-color: ${A}; color: white; padding: 7px 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; border-right: 1px solid rgba(255,255,255,0.2); width: 55px; text-align: center;">DISC%</th>
            <th style="background-color: ${A}; color: white; padding: 7px 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; border-right: 1px solid rgba(255,255,255,0.2); width: 55px; text-align: center;">GST%</th>
            <th style="background-color: ${A}; color: white; padding: 7px 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; width: 75px; text-align: right;">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          ${z}
        </tbody>
      </table>

      <!-- Calculations and Payment Details -->
      <div style="display: flex; justify-content: space-between; gap: 30px; margin-top: 10px; width: 100%;">
        <!-- Left: Calculations -->
        <div style="flex: 1; display: flex; flex-direction: column; gap: 2px;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 600; color: ${F}; padding: 1px 0;">
            <span>MRP Total:</span>
            <span style="color: ${E}; font-weight: 700;">₹${m.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 600; color: ${F}; padding: 1px 0;">
            <span>Discount:</span>
            <span style="color: ${E}; font-weight: 700;">-₹${r.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 600; color: ${F}; padding: 1px 0;">
            <span>Base Price (Excl. GST):</span>
            <span style="color: ${E}; font-weight: 700;">₹${w.toFixed(2)}</span>
          </div>
          ${y}
          <div style="background-color: ${A}; color: white; display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; border-radius: 4px; margin-top: 12px;">
            <span style="font-size: 13px; font-weight: 800; text-transform: uppercase;">Grand Total:</span>
            <span style="font-size: 24px; font-weight: 900;">₹${Math.round(s).toLocaleString()}</span>
          </div>
        </div>

        <!-- Right: Payment Box & Get Well Soon Card -->
        <div style="width: 250px; flex-shrink: 0; display: flex; flex-direction: column; gap: 12px;">
          <div style="border: 1px solid ${D}; border-radius: 4px; overflow: hidden;">
            <div style="background-color: ${A}; color: white; padding: 5px 15px; font-size: 11px; font-weight: 800; text-align: center;">Payment Details</div>
            <div style="padding: 8px 12px; background-color: #f8fafc;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 10px; border-bottom: 1px solid ${D}; padding-bottom: 3px;">
                <span style="color: ${F}; font-weight: 500;">Paid Amount:</span>
                <span style="font-weight: 700; color: ${E};">₹${Math.round(t).toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 10px; border-bottom: 1px solid ${D}; padding-bottom: 3px;">
                <span style="color: ${F}; font-weight: 500;">Balance:</span>
                <span style="font-weight: 700; color: ${E};">₹${Math.round(v).toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 10px;">
                <span style="color: ${F}; font-weight: 500;">Payment Mode:</span>
                <span style="font-weight: 700; color: ${E};">${k}</span>
              </div>
            </div>
          </div>

          <!-- Get Well Soon Card matching Screenshot 5 -->
          <div style="text-align: center; padding: 10px; background: #f8fafc; border-radius: 10px; border: 1px solid ${D};">
            <div style="color: ${A}; font-family: 'Brush Script MT', cursive, sans-serif; font-size: 20px; margin-bottom: 2px;">Get Well Soon!</div>
            <div style="font-weight: 800; font-size: 11px; color: ${A};">${h.name||"Pharma Store"}</div>
            <div style="font-size: 9px; color: ${F};">Support: ${h.phone||h.contact||"-"}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pinned Footer matching Appointment Slip -->
    <div style="margin-top: auto; padding-top: 15px;">
      ${H}
    </div>
  </div>
</body>
</html>`,e=`Pharmacy Tax Invoice - ${a}`,f=`PharmacyInvoice_${a}.pdf`,g=`*${(h.name||"HOSPITAL").toUpperCase()}*
━━━━━━━━━━━━━━━━━━
*PHARMACY RETAIL TAX INVOICE*

*Patient:* ${n}
*Invoice #:* ${a}
*Amount:* ₹${s}
━━━━━━━━━━━━━━━━━━
• Dispensed medicines tax invoice attached.`}else if("discharge-summary"===b||"discharge"===b){let a=c.record||c,b=a.admission||c.admission||a;d=(0,x.H)(h,j,b,a,a.dischargeData||a),e=`Discharge Summary - ${n||"Patient"}`,f=`DischargeSummary_${c._id||"record"}.pdf`,g=`*HOSPITAL DISCHARGE SUMMARY*
━━━━━━━━━━━━━━━━━━
*Patient:* ${n}
*MRN:* ${o}
*Discharge Date:* ${a.dischargeDate||""}
━━━━━━━━━━━━━━━━━━
• Official clinical discharge summary attached.`}else if("discharge-settlement"===b||"final-bill"===b){let a=c.reportData||{},b=c.admission||c.admissionInfo||{},i=c.patientInfo||{},k={...j,..."object"==typeof c.patient?c.patient:{},...i||{},name:n,mrn:o||i.mrn||"",mobile:p||i.mobile||i.phone||"",address:q||i.address||"",age:t||i.age||"",gender:s||i.gender||"",dob:r||i.dob||"",honorific:l||i.honorific||"",profile:{...j.profile||{},guardianName:i.guardianName||j.profile?.guardianName||c.patientDetails?.guardianName||"",GuardianName:i.GuardianName||j.profile?.GuardianName||c.patientDetails?.GuardianName||"",mrn:o||i.mrn||""}},m={...b,status:c.dischargeDate||b.dischargeDate||"Discharged"===b.status?"Discharged":b.status||"Active",admissionDate:b.admissionDate||c.admissionDate||"",dischargeDate:b.dischargeDate||c.dischargeDate||"",admissionId:b.admissionId||b.ipNo||c.ipNo||"",wardName:b.wardName||b.ward?.name||c.roomType||"",bedNumber:b.bedNumber||b.bedId||c.bedNo||"",doctorName:b.doctorName||c.primaryDoctor||u||"",dischargeType:b.dischargeType||c.dischargeType||"",organization:b.organization||c.insuranceName||""},v={doctors:a.doctors||[],admissions:a.admissions||[],diags:a.diags||[],rads:a.rads||[],services:a.services||[],meds:a.meds||[],payments:a.payments||c.receipts||[]},x=c.totals||{},B=x.grandTotal??x.netAmount??c.totalBillAmount??c.totalAmount??c.amount??0,C=x.totalPaid??x.paidAmt??c.totalPaidAmount??c.paidAmount??c.advanceAmount??0,D=x.balance??B-C,E=x.discount??c.discountAmount??0,F={...h,...c.hospitalInfo||{},name:h.name||c.hospitalInfo?.name||"",address:h.address||c.hospitalInfo?.address||"",phone:h.phone||h.contact||c.hospitalInfo?.phone||"",logo:h.logo||c.hospitalInfo?.logo||"",gstNumber:h.gstNumber||h.gst||c.hospitalInfo?.gstNumber||"",cinNumber:h.cinNumber||h.cin||c.hospitalInfo?.cinNumber||""},G=/discharged/i.test(m?.status||"")||!!m?.dischargeDate||!!c?.dischargeData;d=((a,b,c,d,e,f,g)=>{let h=a=>Number(a||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2}),i=`K-PRB${new Date().getTime().toString().slice(-8)}`,j=d?.doctors?.length>0?d.doctors[0]:null,k=j?.doctorName||j?.serviceName||"";k.toLowerCase().includes("consultation")&&(k=k.replace(/consultation/i,"").trim()),k||(k=b?.activeConsultation?.doctor?.user?.name||b?.lastVisit?.doctor?.user?.name||"");let l=d?.admissions?.length>0?d.admissions[d.admissions.length-1]:null,m="",n="";if(l?.chargeType){let a=l.chargeType.match(/Bed\s+([^\s(]+)\s*\(([^)]+)\)/i);a?(m=a[1],n=a[2]):n=l.chargeType}let o=b?.mrn||b?.user?.mrn||b?.profile?.mrn||b?.umr||b?.patientId||b?.user?._id||b?._id||"",p=b?.mobile||b?.user?.mobile||b?.profile?.contactNumber||b?.profile?.phone||b?.phone||b?.patientDetails?.phone||"",q=!!(c&&Object.keys(c).length>0||d?.admissions&&d.admissions.length>0||!d?.isOPD),r=!!(g?.isHistory||g?.isFinalBill||/discharged/i.test(c?.status||"")||c?.dischargeDate||d?.dischargeData||d?.admission?.dischargeDate||/discharged/i.test(d?.admission?.status||"")),s=g?.customTitle?g.customTitle:q?r?"IP Final Bill - Detailed":"IP Interim Bill-Detailed":"OP Interim Bill-Detailed",t=`
    <!DOCTYPE html>
    <html>
    <head>
        <title>${s} - ${i}</title>
        <style>
            @page {
                size: A4;
                margin: 5mm 8mm;
                @bottom-right {
                    content: "Page " counter(page) " of " counter(pages);
                }
            }
            body { font-family: 'Helvetica', 'Arial', sans-serif; margin: 0; padding: 0; color: #000; }
            
            .header-table { width: 100%; border-bottom: 2px solid #000; margin-bottom: 10px; }
            .hospital-name { font-size: 20px; font-weight: bold; color: #000080; text-align: center; text-transform: uppercase; margin: 0 0 5px 0; }
            .hospital-address { font-size: 11px; text-align: center; margin: 0 0 3px 0; }
            .hospital-contact { font-size: 11px; text-align: center; margin: 0 0 10px 0; }
            
            .title-bar { 
                text-align: center; 
                border-bottom: 2px solid #000; 
                padding: 5px 0; 
                font-weight: bold; 
                font-size: 13px;
                background-color: #f8f8f8;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .subtitle-bar {
                text-align: center;
                border-bottom: 1px solid #000;
                padding: 3px 0;
                font-weight: bold;
                font-size: 13px;
                background-color: #f8f8f8;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }

            .info-grid { width: 100%; border-bottom: 1px solid #ccc; font-size: 11px; padding: 6px 0; margin-bottom: 4px; }
            .info-grid td { vertical-align: top; padding: 2px 4px; line-height: 1.5; }
            .info-label { width: 120px; font-weight: 600; color: #333; }
            
            .data-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 6px; }
            .data-table th { 
                border-top: 1.5px solid #000; 
                border-bottom: 1.5px solid #000; 
                padding: 5px 4px; 
                text-align: left;
                font-weight: bold;
                background-color: #fafafa;
            }
            .data-table th.right { text-align: right; }
            .data-table td { padding: 4px 4px; vertical-align: top; line-height: 1.4; }
            .data-table td.right { text-align: right; }
            .data-table td.center { text-align: center; }
            
            .cat-header { 
                font-weight: bold; 
                color: #000080;
                padding-top: 10px !important;
                padding-bottom: 5px !important;
                font-size: 11.5px;
            }
            .subtotal-row { border-top: 1px solid #555; border-bottom: 1px solid #555; font-weight: bold; background-color: #f9f9f9; }
            .subtotal-row td { padding: 4px 4px; }
            
            .summary-section { margin-top: 10px; width: 100%; border-top: 2px solid #000; padding-top: 10px; display: flex; justify-content: space-between; }
            .words { font-weight: bold; width: 60%; }
            .totals-box { width: 35%; }
            .totals-box table { width: 100%; border-collapse: collapse; font-size: 11px; font-weight: bold; }
            .totals-box table td { padding: 3px; }
            .totals-box table td:last-child { text-align: right; }
            
            .receipt-section { margin-top: 15px; width: 100%; }
            .receipt-section h4 { margin: 0 0 5px 0; font-size: 12px; font-weight: bold; }
            
            .footer { margin-top: 60px; display: flex; justify-content: space-between; font-weight: bold; font-size: 11px; }
            .footer-bottom { margin-top: 20px; display: flex; justify-content: space-between; font-size: 10px; }
        </style>
    </head>
    <body>
        <div class="receipt-container" style="padding: 5mm 8mm; box-sizing: border-box; min-height: 100%;">
        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 2px solid #000; margin-bottom: 6px;">
            <div style="width: 25%; text-align: left;">
                ${a.logo?`<img src="${a.logo}" style="max-height: 80px; max-width: 100%;" />`:""}
            </div>
            <div style="width: 50%; text-align: center;">
                <h1 class="hospital-name">${a?.name||"HOSPITAL NAME"}</h1>
                <p class="hospital-address">${a?.address||""}</p>
                <p class="hospital-contact">Phone: ${a?.phone||""}</p>
            </div>
            <div style="width: 25%;"></div>
        </div>
        
        <div class="title-bar">${s}</div>
        <div class="subtitle-bar">BILL OF SUPPLY / INVOICE NO : ${i}</div>
        
        <table class="info-grid">
            <tr>
                <td style="width: 50%;">
                    <table style="width: 100%; border: none;">
                        <tr><td class="info-label">CIN No</td><td>: ${a?.cinNumber||a?.cin||""}</td></tr>
                        <tr><td class="info-label">Patient Name</td><td>: <b>${(0,y.im)(b,c)}</b></td></tr>
                        <tr><td class="info-label">Age/Sex</td><td>: ${(()=>{let a=b?.dob||b?.profile?.dob||b?.patientDetails?.dob||b?.dateOfBirth||b?.user?.dateOfBirth,c=b?.age||b?.profile?.age||b?.patientDetails?.age||b?.user?.age,d=b?.ageUnit||b?.profile?.ageUnit||b?.patientDetails?.ageUnit||b?.user?.ageUnit,e=(0,w.Qs)(a,c,d),f=b?.gender||b?.profile?.gender||b?.patientDetails?.gender||b?.user?.gender||"";return[e&&"N/A"!==e?e:"",f?f.charAt(0).toUpperCase()+f.slice(1).toLowerCase():""].filter(Boolean).join(" / ")||"N/A"})()}</td></tr>
                        <tr><td class="info-label">S/W/D</td><td>: ${(()=>{let a=d?.guardianName||d?.GuardianName||b?.guardianName||b?.GuardianName||b?.profile?.GuardianName||b?.profile?.guardianName||b?.user?.guardianName||b?.user?.GuardianName||b?.caregiverName||b?.patientDetails?.guardianName||b?.patientDetails?.GuardianName||c?.guardianName||"",e=String(d?.guardianMobile||d?.GuardianMobile||b?.guardianMobile||b?.GuardianMobile||b?.profile?.GuardianMobile||b?.profile?.guardianMobile||b?.user?.guardianMobile||c?.guardianMobile||"").trim(),f=e.replace(/\D/g,""),g=e&&!["na","n/a","null","undefined","none","-","0"].includes(e.toLowerCase())&&f.length>=10;return a?g?`${a} (${e})`:a:""})()}</td></tr>
                        <tr><td class="info-label">Doctor</td><td>: ${(0,y.I)(c?.doctorName||c?.doctor?.name||k||"")}</td></tr>
                        ${c?.admissionDate?`<tr><td class="info-label">Admission Dt</td><td>: ${z(c?.admissionDate)}</td></tr>`:""}
                        <tr><td class="info-label">Organization</td><td>: ${c?.organization||c?.sponsorName||""}</td></tr>
                        <tr><td class="info-label">Patient Type</td><td>: ${!c||!c.admissionId&&!c.ipNo&&!c.status&&!d?.admissions?.length?"OP Patient":c?.type||c?.admissionType||"IPD"}</td></tr>
                        <tr><td class="info-label">Secondary Dr.</td><td>: ${c?.secondaryDoctor?.name||c?.secondaryDoctorName||""}</td></tr>
                        <tr><td class="info-label">Address</td><td>: ${b?.address||b?.patientAddress||b?.patientDetails?.address||b?.profile?.address||""}</td></tr>
                        <tr><td class="info-label">Referal By</td><td>: ${d?.doctorReference||d?.referredBy||c?.doctorReference||c?.referredBy||c?.admissionInfo?.doctorReference||c?.admissionInfo?.referredBy||b?.doctorReference||b?.referredBy||b?.profile?.doctorReference||b?.profile?.referredBy||b?.patientDetails?.doctorReference||b?.patientDetails?.referredBy||b?.lastVisit?.doctorReference||b?.lastVisit?.patientDetails?.doctorReference||b?.user?.doctorReference||b?.patientInfo?.doctorReference||b?.patientInfo?.referredBy||""}</td></tr>
                    </table>
                </td>
                <td style="width: 50%;">
                    <table style="width: 100%; border: none;">
                        <tr><td class="info-label">GST No</td><td>: ${a?.gstNumber||a?.gst||""}</td></tr>
                        ${c?.admissionId?`<tr><td class="info-label">IP No</td><td>: ${c?.admissionId}</td></tr>`:""}
                        <tr><td class="info-label">UMR No</td><td>: ${o}</td></tr>
                        <tr><td class="info-label">Bill No</td><td>: ${i}</td></tr>
                        <tr><td class="info-label">Bill Dt</td><td>: ${z(new Date)}</td></tr>
                        ${r?`
                        <tr><td class="info-label">Discharge Type</td><td>: ${c?.dischargeType||d?.dischargeData?.dischargeType||d?.dischargeType||"Regular"}</td></tr>
                        <tr><td class="info-label">Discharge Dt</td><td>: ${z(c?.dischargeDate||d?.dischargeData?.dischargeDate||d?.dischargeDate||c?.updatedAt||d?.updatedAt||new Date)}</td></tr>
                        `:""}
                        ${c?.wardName||c?.ward?.name||c?.bed?.wardName||c?.bed?.type||n?`<tr><td class="info-label">Ward</td><td>: ${c?.wardName||c?.ward?.name||c?.bed?.wardName||c?.bed?.type||n}</td></tr>`:""}
                        ${c?.bedNumber||c?.bed?.bedId||c?.bed?.number||c?.bedId||m?`<tr><td class="info-label">Bed No</td><td>: ${c?.bedNumber||c?.bed?.bedId||c?.bed?.number||c?.bedId||m}</td></tr>`:""}
                        <tr><td class="info-label">Phone No</td><td>: ${p}</td></tr>
                    </table>
                </td>
            </tr>
        </table>

        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 5%">S.No</th>
                    <th style="width: 12%">Code</th>
                    <!-- <th style="width: 16%">Date / Time</th> -->
                    <th style="width: 51%">Service Name</th>
                    <th class="right" style="width: 10%">Rate</th>
                    <th class="right" style="width: 10%">Qty</th>
                    <th class="right" style="width: 12%">Amount</th>
                </tr>
            </thead>
            <tbody>
    `,u=(a,b="")=>{if(!a)return b;if("string"==typeof a){let c=a.trim();return"[object Object]"===c||"object Object"===c?b:c}return"object"==typeof a?u(a.testName)||u(a.name)||u(a.title)||u(a.description)||u(a.serviceName)||u(a.medicineName)||u(a.doctorName)||u(a.chargeType)||b:String(a)},v=(a,b)=>{if(!a||0===a.length)return"";let d=`<tr><td colspan="6" class="cat-header">${b}</td></tr>`,e=0;return a.forEach((a,f)=>{let g=a.quantity||a.visits||a.days||1,i="string"==typeof g?g:h(g),j=a.amount||a.rate*("number"==typeof g?g:1);e+=j;let k=b.toLowerCase().includes("consultation")?a.serviceName||a.doctorName||"Doctor Consultation":a.testName||a.serviceName||a.doctorName||a.chargeType||a.medicineName||a.description||"Service",l=a.rate,m=i,n=String(k).match(/\((?:Qty\/Days|Qty|Days):\s*([0-9.]+)\)/i);if(n){let a=parseFloat(n[1]);!isNaN(a)&&a>0&&(m=h(a),l=j/a,k=String(k).replace(/\s*\((?:Qty\/Days|Qty|Days):\s*[0-9.]+\)/i,"").trim())}let o=b.toLowerCase().includes("consultation")?(0,y.I)(u(k,"Doctor Consultation")):u(k,"Service"),p=u(a.code||a.serviceCode||a.testCode||a.itemCode||"");if(!p){let c=b.toLowerCase().includes("consultation")?"SVC":b.toLowerCase().includes("investigation")?"LAB":b.toLowerCase().includes("ward")?"BED":b.toLowerCase().includes("radiology")?"RAD":b.toLowerCase().includes("pharmacy")?"MED":"SVC",d=a._id?a._id.toString().slice(-6).toUpperCase():a.id&&"string"==typeof a.id&&a.id.length>=4?a.id.slice(-6).toUpperCase():`${f+1}`;p="BED"===c?`BED${f+1}`:`${c}${d}`}let q=A(a.date||a.dateTime||a.createdAt||a.startDate||c?.admissionDate);d+=`
                <tr>
                    <td class="center">${f+1}</td>
                    <td>${p}</td>
                    <!-- <td style="font-size: 9px; white-space: nowrap;">${q}</td> -->
                    <td>${o}</td>
                    <td class="right">${h(l)}</td>
                    <td class="right">${m}</td>
                    <td class="right">${h(j)}</td>
                </tr>
            `}),d+=`
            <tr class="subtotal-row">
                <td colspan="5" class="right">Sub Total :</td>
                <td class="right">${h(e)}</td>
            </tr>
        `},x={consultations:f?.consultations!==!1,investigations:f?.investigations!==!1,wards:f?.wards!==!1,radiology:f?.radiology!==!1,services:f?.services!==!1,pharmacy:f?.pharmacy!==!1,receipts:f?.receipts!==!1};if(x.consultations&&(t+=v(d.doctors,"Consultation Charges")),x.investigations&&(t+=v(d.diags,"INVESTIGATION CHARGES")),x.wards&&(t+=v(d.admissions,"Ward Charges")),x.radiology){let a=d.rads||[];t+=v(a,"Radiology Charges")}if(x.services&&(t+=v(d.services,"SERVICE CHARGES")),x.pharmacy&&(t+=v(d.meds,"PHARMACY CHARGES")),t+=`
            </tbody>
        </table>
        
        <div class="summary-section">
            <div class="words">
                Rupees In : ${(a=>{if(0===a)return"Zero Only";let b=Math.round(Math.abs(Number(a)||0));if(0===b)return"Zero Only";let c=["","One ","Two ","Three ","Four ","Five ","Six ","Seven ","Eight ","Nine ","Ten ","Eleven ","Twelve ","Thirteen ","Fourteen ","Fifteen ","Sixteen ","Seventeen ","Eighteen ","Nineteen "],d=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"],e=a=>a<20?c[a]:a<100?d[Math.floor(a/10)]+(a%10!=0?" "+c[a%10]:""):a<1e3?c[Math.floor(a/100)]+"Hundred "+(a%100!=0?"and "+e(a%100):""):a<1e5?e(Math.floor(a/1e3))+"Thousand "+(a%1e3!=0?e(a%1e3):""):a<1e7?e(Math.floor(a/1e5))+"Lakh "+(a%1e5!=0?e(a%1e5):""):e(Math.floor(a/1e7))+"Crore "+(a%1e7!=0?e(a%1e7):""),f=e(b).trim()+" Rupees Only";return a<0?"Minus "+f:f})(e.balance>0?e.balance:e.grandTotal-(e.discount||0))}
                <br/><br/>
                <span style="font-weight: normal;">Reason : </span>
            </div>
            <div class="totals-box">
                <table>
                    <tr><td>Grand Total :</td><td>${h(e.grandTotal)}</td></tr>
                    ${e.discount&&e.discount>0?`<tr style="color:#c0392b;"><td>(-) Discount / Adj. :</td><td>- ${h(e.discount)}</td></tr>`:""}
                    <tr style="font-weight:bold; border-top: 1px solid #333;"><td>After Discount :</td><td>${h(e.grandTotal-(e.discount||0))}</td></tr>
                    <tr><td>(-) Paid Amt :</td><td>- ${h(e.totalPaid)}</td></tr>
                    <tr style="font-weight:bold; border-top: 1px solid #333;"><td>Balance Amt :</td><td>${h(e.balance)}</td></tr>
                </table>
            </div>
        </div>
    `,x.receipts&&d.payments&&d.payments.length>0){t+=`
            <div class="receipt-section">
                <div style="border-bottom: 1px solid #000; font-weight: bold; margin-bottom: 6px; padding-bottom: 3px; font-size: 12px;">Receipt Details :</div>
                <table style="width:100%; border-collapse: collapse; font-size: 11px;">
                    <colgroup>
                        <col style="width: 5%;">
                        <col style="width: 25%;">
                        <col style="width: 26%;">
                        <col style="width: 26%; text-align: right;">
                        <col style="width: 18%;">
                    </colgroup>
                    <thead>
                        <tr style="border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; background-color: #fafafa;">
                            <th style="padding: 5px 4px; font-weight: bold; text-align: left;">S.No</th>
                            <th style="padding: 5px 4px; font-weight: bold; text-align: left;">Date / Time</th>
                            <th style="padding: 5px 4px; font-weight: bold; text-align: left;">Receipt No</th>
                            <th style="padding: 5px 4px; font-weight: bold; text-align: right;">Amount Payment</th>
                            <th style="padding: 5px 4px; font-weight: bold; text-align: left;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
        `;let a=0;d.payments.forEach((b,c)=>{let d=String(b.status||b.transactionType||"").trim().toLowerCase();if((!d||"paid"===d||"completed"===d||"settlement"===d||"advance"===d||"success"===d||"cleared"===d)&&!d.includes("fail")&&!d.includes("cancel")&&!d.includes("reverse")&&!d.includes("pend")){a+=Number(b.amount||0);let d=b.mode||b.paymentMode||"Paid";if("advance"===d.toLowerCase()&&(d="Paid"),"mixed"===d.toLowerCase()&&b.paymentDetails){let a=[];b.paymentDetails.cash&&a.push(`Cash: ${h(b.paymentDetails.cash)}`),b.paymentDetails.upi&&a.push(`UPI: ${h(b.paymentDetails.upi)}`),b.paymentDetails.card&&a.push(`Card: ${h(b.paymentDetails.card)}`),b.paymentDetails.bankTransfer&&a.push(`Bank: ${h(b.paymentDetails.bankTransfer)}`),a.length>0&&(d=`Mixed (${a.join(", ")})`)}t+=`
                    <tr>
                        <td style="padding: 4px 4px; text-align: center;">${c+1}</td>
                        <td style="padding: 4px 4px; font-size: 9.5px; white-space: nowrap;">${A(b.date||b.createdAt||b.paymentDate)}</td>
                        <td style="padding: 4px 4px;">${b.receiptNo||b.receiptNumber||"-"}</td>
                        <td style="padding: 4px 4px; text-align: right;">${h(Number(b.amount||0))}</td>
                        <td style="padding: 4px 4px;">${d}</td>
                    </tr>
                `}}),t+=`
                    <tr style="border-top: 1px solid #000; border-bottom: 1px solid #000; font-weight: bold; background-color: #f9f9f9;">
                        <td colspan="3" style="padding: 4px 4px; text-align: right;">Total :</td>
                        <td style="padding: 4px 4px; text-align: right;">${h(a)}</td>
                        <td style="padding: 4px 4px;"></td>
                    </tr>
                </tbody>
            </table>
        </div>
        `}return t+=`
        <div style="margin-top: 30px; border-top: 1px solid #000; width: 40%; margin-left: 30%;"></div>
        
        <div class="footer">
            <div style="text-align: center;">Patient/Attendant Signatory</div>
            <div style="text-align: center;">
                <br/>
                Authorised Signatory
            </div>
        </div>
        
        <div class="footer-bottom">
            <div>Printed Dt & Time : ${z(new Date)}</div>
        </div>
        </div>
    </body>
    </html>
    `})(F,k,m,v,{grandTotal:B,totalPaid:C,balance:D,discount:E},{consultations:!0,investigations:!0,wards:!0,radiology:!0,services:!0,pharmacy:!0,receipts:!0},{isFinalBill:G});let H=G?"IP Final Bill":"IP Interim Bill";e=`${H} - ${n||"Patient"}`,f=`${H.replace(/ /g,"_")}_${c._id||"bill"}.pdf`,g=`*${H.toUpperCase()} - DETAILED*
━━━━━━━━━━━━━━━━━━
*Patient:* ${n}
*MRN:* ${o}
*Grand Total:* ₹${B}
*Paid:* ₹${C}
*Balance:* ₹${D}
━━━━━━━━━━━━━━━━━━
• Official IP Interim/Final Bill - Detailed attached.`}return v.NextResponse.json({success:!0,type:b,id:c._id||c.appointmentId||"rendered",html:d,title:e,documentName:f,caption:g})}catch(a){return console.error("[POST /api/receipts/render Error]:",a),v.NextResponse.json({success:!1,error:a.message||"Failed to render official receipt"},{status:500})}}let E=new e.AppRouteRouteModule({definition:{kind:f.RouteKind.APP_ROUTE,page:"/api/receipts/render/route",pathname:"/api/receipts/render",filename:"route",bundlePath:"app/api/receipts/render/route"},distDir:".next",relativeProjectDir:"",resolvedPagePath:"C:\\Users\\shaik\\Desktop\\mscurechain\\Mscurechain-Frontend-Latest\\app\\api\\receipts\\render\\route.ts",nextConfigOutput:"standalone",userland:d}),{workAsyncStorage:F,workUnitAsyncStorage:G,serverHooks:H}=E;function I(){return(0,g.patchFetch)({workAsyncStorage:F,workUnitAsyncStorage:G})}async function J(a,b,c){var d;let e="/api/receipts/render/route";"/index"===e&&(e="/");let g=await E.prepare(a,b,{srcPage:e,multiZoneDraftMode:!1});if(!g)return b.statusCode=400,b.end("Bad Request"),null==c.waitUntil||c.waitUntil.call(c,Promise.resolve()),null;let{buildId:v,params:w,nextConfig:x,isDraftMode:y,prerenderManifest:z,routerServerContext:A,isOnDemandRevalidate:B,revalidateOnlyGenerated:C,resolvedPathname:D}=g,F=(0,j.normalizeAppPath)(e),G=!!z.routes[D]&&(E.isDev||(0,t.isRouteCacheOwner)(D,E.cacheOwner,z.routes[D])),H=!!(z.dynamicRoutes[F]||G);if(H&&!y){let a=z.dynamicRoutes[F];if(a&&!1===a.fallback&&!G)throw new s.NoFallbackError}let I=null;!H||E.isDev||y||(I="/index"===(I=D)?"/":I);let J=!0===E.isDev||!H,K=H&&!J,L=a.method||"GET",M=(0,i.getTracer)(),N=M.getActiveScopeSpan(),O={params:w,prerenderManifest:z,renderOpts:{experimental:{cacheComponents:!!x.experimental.cacheComponents,authInterrupts:!!x.experimental.authInterrupts},supportsDynamicResponse:J,incrementalCache:(0,h.getRequestMeta)(a,"incrementalCache"),cacheLifeProfiles:null==(d=x.experimental)?void 0:d.cacheLife,isRevalidate:K,waitUntil:c.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:void 0,onInstrumentationRequestError:(b,c,d)=>E.onRequestError(a,b,d,A)},sharedContext:{buildId:v}},P=new k.NodeNextRequest(a),Q=new k.NodeNextResponse(b),R=l.NextRequestAdapter.fromNodeNextRequest(P,(0,l.signalFromNodeResponse)(b));try{let d=async c=>E.handle(R,O).finally(()=>{if(!c)return;c.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let d=M.getRootSpanAttributes();if(!d)return;if(d.get("next.span_type")!==m.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${d.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let e=d.get("next.route");if(e){let a=`${L} ${e}`;c.setAttributes({"next.route":e,"http.route":e,"next.span_name":a}),c.updateName(a)}else c.updateName(`${L} ${a.url}`)}),g=async g=>{var i,j;let k=async({previousCacheEntry:f})=>{try{if(!(0,h.getRequestMeta)(a,"minimalMode")&&B&&C&&!f)return b.statusCode=404,b.setHeader("x-nextjs-cache","REVALIDATED"),b.end("This page could not be found"),null;let e=await d(g);a.fetchMetrics=O.renderOpts.fetchMetrics;let i=O.renderOpts.pendingWaitUntil;i&&c.waitUntil&&(c.waitUntil(i),i=void 0);let j=O.renderOpts.collectedTags;if(!H)return await (0,o.I)(P,Q,e,O.renderOpts.pendingWaitUntil),null;{let a=await e.blob(),b=(0,p.toNodeOutgoingHttpHeaders)(e.headers);j&&(b[r.NEXT_CACHE_TAGS_HEADER]=j),!b["content-type"]&&a.type&&(b["content-type"]=a.type);let c=void 0!==O.renderOpts.collectedRevalidate&&!(O.renderOpts.collectedRevalidate>=r.INFINITE_CACHE)&&O.renderOpts.collectedRevalidate,d=void 0===O.renderOpts.collectedExpire||O.renderOpts.collectedExpire>=r.INFINITE_CACHE?void 0:O.renderOpts.collectedExpire;return{value:{kind:u.CachedRouteKind.APP_ROUTE,status:e.status,body:Buffer.from(await a.arrayBuffer()),headers:b},cacheControl:{revalidate:c,expire:d}}}}catch(b){throw(null==f?void 0:f.isStale)&&await E.onRequestError(a,b,{routerKind:"App Router",routePath:e,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:K,isOnDemandRevalidate:B})},A),b}},l=await E.handleResponse({req:a,nextConfig:x,cacheKey:I,routeKind:f.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:z,isRoutePPREnabled:!1,isOnDemandRevalidate:B,revalidateOnlyGenerated:C,responseGenerator:k,waitUntil:c.waitUntil});if(!H)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==u.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(j=l.value)?void 0:j.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});(0,h.getRequestMeta)(a,"minimalMode")||b.setHeader("x-nextjs-cache",B?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),y&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,p.fromNodeOutgoingHttpHeaders)(l.value.headers);return(0,h.getRequestMeta)(a,"minimalMode")&&H||m.delete(r.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||b.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,q.getCacheControlHeader)(l.cacheControl)),await (0,o.I)(P,Q,new Response(l.value.body,{headers:m,status:l.value.status||200})),null};N?await g(N):await M.withPropagatedContext(a.headers,()=>M.trace(m.BaseServerSpan.handleRequest,{spanName:`${L} ${a.url}`,kind:i.SpanKind.SERVER,attributes:{"http.method":L,"http.target":a.url}},g))}catch(b){if(b instanceof s.NoFallbackError||await E.onRequestError(a,b,{routerKind:"App Router",routePath:F,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:K,isOnDemandRevalidate:B})}),H)throw b;return await (0,o.I)(P,Q,new Response(null,{status:500})),null}}},63033:a=>{a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},86439:a=>{a.exports=require("next/dist/shared/lib/no-fallback-error.external")}};var b=require("../../../../webpack-runtime.js");b.C(a);var c=b.X(0,[3897,1692,8568],()=>b(b.s=57198));module.exports=c})();