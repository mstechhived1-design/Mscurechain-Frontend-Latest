"use strict";(()=>{var a={};a.id=2942,a.ids=[2942],a.modules={261:a=>{a.exports=require("next/dist/shared/lib/router/utils/app-paths")},3295:a=>{a.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:a=>{a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},19121:a=>{a.exports=require("next/dist/server/app-render/action-async-storage.external.js")},29294:a=>{a.exports=require("next/dist/server/app-render/work-async-storage.external.js")},33347:(a,b,c)=>{c.r(b),c.d(b,{handler:()=>H,patchFetch:()=>G,routeModule:()=>C,serverHooks:()=>F,workAsyncStorage:()=>D,workUnitAsyncStorage:()=>E});var d={};c.r(d),c.d(d,{GET:()=>B});var e=c(95736),f=c(9117),g=c(4044),h=c(39326),i=c(32324),j=c(261),k=c(54290),l=c(85328),m=c(38928),n=c(46595),o=c(3421),p=c(17679),q=c(41681),r=c(63446),s=c(86439),t=c(34679),u=c(51356),v=c(10641),w=c(1371),x=c(29468);let y="https://mscurechain-backend-latest-production.up.railway.app/api",z=process.env.BACKEND_INTERNAL_URL?.trim().replace(/\/+$/,"")||y;(!z||z.startsWith("/"))&&(z=y);let A=/^https?:\/\//i.test(z)?z:z.includes("localhost")||z.includes("127.0.0.1")?`http://${z}`:`https://${z}`;async function B(a,{params:b}){try{let{type:c,id:d}=await b,e=a.headers.get("authorization")||"",f={"Content-Type":"application/json"};e&&(f.Authorization=e);let g="",h="Hospital Document",i=`Receipt_${d}.pdf`,j="Here is your official hospital record.";if("prescription"===c){let a=await fetch(`${A}/prescriptions/${d}`,{headers:f}),b=await a.json(),c=b.data||b.prescription||b,e=c.hospital||{},k=c.patient||c.patientId||{},l=c.doctor||c.doctorId||{};g=(0,w.z6)({hospital:e,patient:k,doctor:l,prescription:c,appointment:c.appointment}),h=`Prescription - ${k.name||k.fullName||"Patient"}`,i=`Prescription_${d}.pdf`,j=`*${(e.name||"HOSPITAL").toUpperCase()}*
━━━━━━━━━━━━━━━━━━
*DOCTOR PRESCRIPTION*

*Patient:* ${k.name||k.fullName||"Patient"}
*Doctor:* ${l.name||"Doctor"}
*Date:* ${c.prescriptionDate||new Date().toLocaleDateString("en-IN")}
━━━━━━━━━━━━━━━━━━
• Find your official prescription PDF attached.`}else if("appointment"===c||"consultation"===c){let a=await fetch(`${A}/bookings/${d}`,{headers:f}),b=await a.json(),c=b.data||b.appointment||b.booking||b,e=c.hospital||{},k=c.patient||c.patientDetails||{},l=c.payment||{amount:c.amount||c.fee||0,status:c.paymentStatus||"PAID",mode:c.paymentMethod||"UPI"};g=(0,w.kp)({hospital:e,patient:k,appointment:c,payment:l}),h=`Appointment Receipt - ${k.name||k.fullName||"Patient"}`,i=`AppointmentReceipt_${d}.pdf`,j=`*${(e.name||"HOSPITAL").toUpperCase()}*
━━━━━━━━━━━━━━━━━━
*OPD CONSULTATION RECEIPT*

*Patient:* ${k.name||k.fullName||"Patient"}
*Doctor:* ${c.doctorName||c.doctor?.name||"Doctor"}
*Token No:* #${c.tokenNumber||c.tokenNo||""}
*Amount:* ₹${l.amount||0} (${String(l.status).toUpperCase()})
━━━━━━━━━━━━━━━━━━
• Show this receipt at hospital frontdesk.`}else if("lab-token"===c){let a=await fetch(`${A}/lab/bookings/${d}`,{headers:f}),b=await a.json(),c=b.data||b,e=c.hospital||{},k=c.patient||{},l=c.doctor||{};g=(0,w.rm)({hospital:e,patient:k,doctor:l,appointment:c,tests:c.tests||c.testNames||[],token:c.tokenNumber||c.tokenNo||d,sampleId:c.sampleId||d}),h=`Lab Token - ${k.name||k.fullName||"Patient"}`,i=`LabToken_${d}.pdf`,j=`*${(e.name||"HOSPITAL").toUpperCase()}*
━━━━━━━━━━━━━━━━━━
*LAB PHLEBOTOMY TOKEN*

*Patient:* ${k.name||k.fullName||"Patient"}
*Token No:* #${c.tokenNumber||d}
━━━━━━━━━━━━━━━━━━
• Present this token at sample collection counter.`}else if("lab-invoice"===c||"lab-bill"===c){let a=await fetch(`${A}/lab/bookings/${d}`,{headers:f}),b=await a.json(),c=b.data||b,e=c.hospital||{},k=c.patient||{},l=c.payment||{amount:c.amount||c.totalAmount||0,status:c.paymentStatus||"PAID",mode:c.paymentMode||"CASH"};g=(0,w.Ys)({hospital:e,patient:k,appointment:c,payment:l,tests:c.tests||[],invoiceNo:c.invoiceNo||`LAB-INV-${d.slice(-6).toUpperCase()}`}),h=`Lab Invoice - ${k.name||"Patient"}`,i=`LabInvoice_${d}.pdf`,j=`*${e.name?.toUpperCase()||"HOSPITAL"}*
━━━━━━━━━━━━━━━━━━
*DIAGNOSTIC TEST INVOICE*

*Patient:* ${k.name||"Patient"}
*Amount:* ₹${l.amount||0}
━━━━━━━━━━━━━━━━━━
• Tax invoice for lab diagnostics.`}else if("lab-report"===c){let a=await fetch(`${A}/lab/reports/${d}`,{headers:f}),b=await a.json(),c=b.data||b.report||b,e=c.hospital||{},k=c.patient||{};g=(0,w.qD)({hospital:e,patient:k,doctor:c.doctor,report:c,tests:c.tests||c.results||[],specimen:c.specimen||"Blood"}),h=`Lab Report - ${c.testName||"Investigation"}`,i=`LabReport_${d}.pdf`,j=`*${e.name?.toUpperCase()||"HOSPITAL"}*
━━━━━━━━━━━━━━━━━━
*PATHOLOGY INVESTIGATION REPORT*

*Patient:* ${k.name||"Patient"}
*Test:* ${c.testName||"Investigation"}
*Date:* ${new Date().toLocaleDateString("en-IN")}
━━━━━━━━━━━━━━━━━━
• Official signed lab report attached.`}else if("pharmacy"===c||"pharmacy-invoice"===c){let a=await fetch(`${A}/pharmacy/bills/${d}`,{headers:f}),b=await a.json(),c=b.data||b.bill||b,e={name:c.hospital?.name?`${c.hospital.name} PHARMACY`:"HOSPITAL PHARMACY",address:c.hospital?.address||"",phone:c.hospital?.phone||"",email:c.hospital?.email||"",gstin:c.gstin||c.hospital?.gstin||"",dlNo:c.dlNo||c.hospital?.dlNo||""};g=`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Pharmacy Invoice - ${c.invoiceId||d}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 20px; color: #1e293b; background: #fff; }
    .header { border-bottom: 2px solid #112d42; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; }
    .title { font-size: 24px; font-weight: 800; color: #112d42; margin: 0; }
    .meta { font-size: 11px; color: #64748b; line-height: 1.5; }
    .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    .table th, .table td { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 11px; text-align: left; }
    .table th { background: #f8fafc; color: #112d42; font-weight: 700; }
    .total-box { margin-top: 20px; text-align: right; font-size: 13px; font-weight: 800; }
    .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 10px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">${e.name}</h1>
      <div class="meta">${e.address?`${e.address}<br/>`:""}${e.dlNo?`DL No: ${e.dlNo} | `:""}${e.gstin?`GSTIN: ${e.gstin}`:""}</div>
    </div>
    <div style="text-align: right;">
      <h2 style="margin: 0; font-size: 16px; color: #112d42;">TAX INVOICE</h2>
      <div class="meta">Invoice #: <strong>${c.invoiceId||d}</strong><br/>Date: ${new Date(c.createdAt||Date.now()).toLocaleDateString("en-IN")}</div>
    </div>
  </div>

  <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
    <div class="meta"><strong>Patient:</strong> ${c.patientName||"Patient"}<br/><strong>MRN:</strong> ${c.mrn||"N/A"}</div>
    <div class="meta" style="text-align: right;"><strong>Doctor:</strong> ${c.doctorName||"Doctor"}<br/><strong>Payment Mode:</strong> ${c.paymentSummary?.paymentMode||"CASH"}</div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>#</th>
        <th>Item / Medicine</th>
        <th>Batch</th>
        <th>Exp</th>
        <th>Qty</th>
        <th>MRP</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${(c.items||[]).map((a,b)=>`
        <tr>
          <td>${b+1}</td>
          <td><strong>${a.medicineName||a.name}</strong></td>
          <td>${a.batchNumber||"—"}</td>
          <td>${a.expiryDate||"—"}</td>
          <td>${a.quantity}</td>
          <td>₹${a.price||a.mrp||0}</td>
          <td>₹${(Number(a.quantity||1)*Number(a.price||a.mrp||0)).toFixed(2)}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="total-box">
    Grand Total: ₹${c.paymentSummary?.grandTotal||c.totalAmount||0}
  </div>

  <div class="footer">
    This is a computer-generated Retail Pharmacy Invoice issued under authorized Drug License.
  </div>
</body>
</html>`,h=`Pharmacy Invoice - ${c.invoiceId||d}`,i=`PharmacyInvoice_${d}.pdf`,j=`*${e.name}*
━━━━━━━━━━━━━━━━━━
*PHARMACY MEDICINE INVOICE*

*Invoice No:* ${c.invoiceId||d}
*Total:* ₹${c.paymentSummary?.grandTotal||0}
━━━━━━━━━━━━━━━━━━
• Tax invoice attached.`}else if("discharge-summary"===c||"discharge"===c){let a=await fetch(`${A}/discharge/records/patient-view/${d}`,{headers:f}),b=await a.json(),c=b.data||b.record||b,e=c.hospital||{},k=c.patient||{},l=c.admission||c;g=(0,x.H)(e,k,l,c,c.dischargeData||c),h=`Discharge Summary - ${k.name||"Patient"}`,i=`DischargeSummary_${d}.pdf`,j=`*${e.name?.toUpperCase()||"HOSPITAL"}*
━━━━━━━━━━━━━━━━━━
*INPATIENT DISCHARGE SUMMARY*

*Patient:* ${k.name||"Patient"}
*IP No:* ${l.ipdNo||l.admissionId||"N/A"}
*Discharge Date:* ${new Date().toLocaleDateString("en-IN")}
━━━━━━━━━━━━━━━━━━
• Complete clinical discharge record attached.`}else{if("discharge-settlement"!==c&&"final-bill"!==c)return v.NextResponse.json({success:!1,error:`Unknown receipt type: ${c}`},{status:400});let a=await fetch(`${A}/frontdesk/final-bill/${d}`,{headers:f}),b=await a.json(),e=b.data||b,k=e.hospital||{},l=e.patient||{};g=(0,w.kp)({hospital:k,patient:l,appointment:{...e,type:"DISCHARGE_SETTLEMENT"},payment:{totalBillAmount:e.totalAmount||e.grossTotal||0,advanceAmount:e.advancePaid||0,discount:e.discount||0,amount:e.netSettlementPaid||0,status:"paid",isDischarge:!0},forceDetailed:!0}),h=`Final Bill - ${l.name||"Patient"}`,i=`DischargeSettlement_${d}.pdf`,j=`*${k.name?.toUpperCase()||"HOSPITAL"}*
━━━━━━━━━━━━━━━━━━
*FINAL DISCHARGE SETTLEMENT*

*Patient:* ${l.name||"Patient"}
*IP No:* ${e.admissionId||"N/A"}
*Zero Balance Settlement Paid*
━━━━━━━━━━━━━━━━━━
• Hospital final clearance receipt attached.`}return v.NextResponse.json({success:!0,type:c,id:d,html:g,title:h,documentName:i,caption:j})}catch(a){return console.error("[Receipt Route Error]:",a),v.NextResponse.json({success:!1,error:a.message||"Failed to generate receipt"},{status:500})}}let C=new e.AppRouteRouteModule({definition:{kind:f.RouteKind.APP_ROUTE,page:"/api/receipts/[type]/[id]/route",pathname:"/api/receipts/[type]/[id]",filename:"route",bundlePath:"app/api/receipts/[type]/[id]/route"},distDir:".next",relativeProjectDir:"",resolvedPagePath:"C:\\Users\\shaik\\Desktop\\mscurechain\\Mscurechain-Frontend-Latest\\app\\api\\receipts\\[type]\\[id]\\route.ts",nextConfigOutput:"standalone",userland:d}),{workAsyncStorage:D,workUnitAsyncStorage:E,serverHooks:F}=C;function G(){return(0,g.patchFetch)({workAsyncStorage:D,workUnitAsyncStorage:E})}async function H(a,b,c){var d;let e="/api/receipts/[type]/[id]/route";"/index"===e&&(e="/");let g=await C.prepare(a,b,{srcPage:e,multiZoneDraftMode:!1});if(!g)return b.statusCode=400,b.end("Bad Request"),null==c.waitUntil||c.waitUntil.call(c,Promise.resolve()),null;let{buildId:v,params:w,nextConfig:x,isDraftMode:y,prerenderManifest:z,routerServerContext:A,isOnDemandRevalidate:B,revalidateOnlyGenerated:D,resolvedPathname:E}=g,F=(0,j.normalizeAppPath)(e),G=!!z.routes[E]&&(C.isDev||(0,t.isRouteCacheOwner)(E,C.cacheOwner,z.routes[E])),H=!!(z.dynamicRoutes[F]||G);if(H&&!y){let a=z.dynamicRoutes[F];if(a&&!1===a.fallback&&!G)throw new s.NoFallbackError}let I=null;!H||C.isDev||y||(I="/index"===(I=E)?"/":I);let J=!0===C.isDev||!H,K=H&&!J,L=a.method||"GET",M=(0,i.getTracer)(),N=M.getActiveScopeSpan(),O={params:w,prerenderManifest:z,renderOpts:{experimental:{cacheComponents:!!x.experimental.cacheComponents,authInterrupts:!!x.experimental.authInterrupts},supportsDynamicResponse:J,incrementalCache:(0,h.getRequestMeta)(a,"incrementalCache"),cacheLifeProfiles:null==(d=x.experimental)?void 0:d.cacheLife,isRevalidate:K,waitUntil:c.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:void 0,onInstrumentationRequestError:(b,c,d)=>C.onRequestError(a,b,d,A)},sharedContext:{buildId:v}},P=new k.NodeNextRequest(a),Q=new k.NodeNextResponse(b),R=l.NextRequestAdapter.fromNodeNextRequest(P,(0,l.signalFromNodeResponse)(b));try{let d=async c=>C.handle(R,O).finally(()=>{if(!c)return;c.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let d=M.getRootSpanAttributes();if(!d)return;if(d.get("next.span_type")!==m.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${d.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let e=d.get("next.route");if(e){let a=`${L} ${e}`;c.setAttributes({"next.route":e,"http.route":e,"next.span_name":a}),c.updateName(a)}else c.updateName(`${L} ${a.url}`)}),g=async g=>{var i,j;let k=async({previousCacheEntry:f})=>{try{if(!(0,h.getRequestMeta)(a,"minimalMode")&&B&&D&&!f)return b.statusCode=404,b.setHeader("x-nextjs-cache","REVALIDATED"),b.end("This page could not be found"),null;let e=await d(g);a.fetchMetrics=O.renderOpts.fetchMetrics;let i=O.renderOpts.pendingWaitUntil;i&&c.waitUntil&&(c.waitUntil(i),i=void 0);let j=O.renderOpts.collectedTags;if(!H)return await (0,o.I)(P,Q,e,O.renderOpts.pendingWaitUntil),null;{let a=await e.blob(),b=(0,p.toNodeOutgoingHttpHeaders)(e.headers);j&&(b[r.NEXT_CACHE_TAGS_HEADER]=j),!b["content-type"]&&a.type&&(b["content-type"]=a.type);let c=void 0!==O.renderOpts.collectedRevalidate&&!(O.renderOpts.collectedRevalidate>=r.INFINITE_CACHE)&&O.renderOpts.collectedRevalidate,d=void 0===O.renderOpts.collectedExpire||O.renderOpts.collectedExpire>=r.INFINITE_CACHE?void 0:O.renderOpts.collectedExpire;return{value:{kind:u.CachedRouteKind.APP_ROUTE,status:e.status,body:Buffer.from(await a.arrayBuffer()),headers:b},cacheControl:{revalidate:c,expire:d}}}}catch(b){throw(null==f?void 0:f.isStale)&&await C.onRequestError(a,b,{routerKind:"App Router",routePath:e,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:K,isOnDemandRevalidate:B})},A),b}},l=await C.handleResponse({req:a,nextConfig:x,cacheKey:I,routeKind:f.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:z,isRoutePPREnabled:!1,isOnDemandRevalidate:B,revalidateOnlyGenerated:D,responseGenerator:k,waitUntil:c.waitUntil});if(!H)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==u.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(j=l.value)?void 0:j.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});(0,h.getRequestMeta)(a,"minimalMode")||b.setHeader("x-nextjs-cache",B?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),y&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,p.fromNodeOutgoingHttpHeaders)(l.value.headers);return(0,h.getRequestMeta)(a,"minimalMode")&&H||m.delete(r.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||b.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,q.getCacheControlHeader)(l.cacheControl)),await (0,o.I)(P,Q,new Response(l.value.body,{headers:m,status:l.value.status||200})),null};N?await g(N):await M.withPropagatedContext(a.headers,()=>M.trace(m.BaseServerSpan.handleRequest,{spanName:`${L} ${a.url}`,kind:i.SpanKind.SERVER,attributes:{"http.method":L,"http.target":a.url}},g))}catch(b){if(b instanceof s.NoFallbackError||await C.onRequestError(a,b,{routerKind:"App Router",routePath:F,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:K,isOnDemandRevalidate:B})}),H)throw b;return await (0,o.I)(P,Q,new Response(null,{status:500})),null}}},33873:a=>{a.exports=require("path")},44870:a=>{a.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},55511:a=>{a.exports=require("crypto")},63033:a=>{a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},86439:a=>{a.exports=require("next/dist/shared/lib/no-fallback-error.external")}};var b=require("../../../../../webpack-runtime.js");b.C(a);var c=b.X(0,[3897,1692,8568],()=>b(b.s=33347));module.exports=c})();