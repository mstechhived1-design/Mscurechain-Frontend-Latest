"use client";
import React, { useState } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { useQueryClient } from "@tanstack/react-query";
import { hospitalAdminService } from "@/lib/integrations";
import { User, Briefcase, FileText, Clock, Globe, Eye, EyeOff, ArrowLeft, Activity, Plus, CreditCard, AlertCircle, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { Card } from "@/components/admin";
import { InfrastructureCheck } from "../../components/InfrastructureCheck";

interface FormData {
  honorific:string;
  name:string; email:string; mobile:string; password:string; gender:string; dateOfBirth:string;
  street:string; city:string; state:string; pincode:string;
  department:string; designation:string; employeeId:string; employmentType:string; experienceYears:string; joiningDate:string;
  emergencyContactName:string; emergencyContactMobile:string; emergencyContactRelationship:string;
  shift:string; startTime:string; endTime:string; weeklyOff:string[];
  qualifications:string[]; certifications:string[]; skills:string[];
  bloodGroup:string; languages:string[]; notes:string;
  sickLeaveQuota:string; emergencyLeaveQuota:string; status:string;
  baseSalary:string; panNumber:string; pfNumber:string; esiNumber:string; uanNumber:string;
  aadharNumber:string; fatherName:string; workLocation:string;
  bankDetails:{accountName:string;accountNumber:string;bankName:string;ifscCode:string};
}
type Errors=Partial<Record<string,string>>;
const DAYS=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const validators:Record<string,(v:string)=>string>={
  name:v=>!v.trim()?"Full name is required":!/^[a-zA-Z\s.'-]+$/.test(v.trim())?"Only letters, spaces, dots & hyphens allowed":"",
  email:v=>!v.trim()?"Email is required":!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)?"Invalid email — e.g. name@hospital.com":"",
  mobile:v=>v.length===0?"Mobile is required":v.length!==10?`${v.length}/10 digits — must be exactly 10`:"",
  password:v=>!v?"Password is required":v.length<6?`Too short — ${v.length}/6 chars minimum`:"",
  designation:v=>!v.trim()?"Designation is required":"",
  pincode:v=>v&&v.length!==6?`${v.length}/6 digits`:"",
  emergencyContactMobile:v=>v&&v.length!==10?`${v.length}/10 digits — must be exactly 10`:"",
  panNumber:v=>v&&v.toUpperCase()!=="N/A"&&!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v.toUpperCase())?"Invalid PAN — e.g. ABCDE1234F":"",
  aadharNumber:v=>v&&v.toUpperCase()!=="N/A"&&v.length!==12?`${v.length}/12 digits — must be exactly 12`:"",
  ifscCode:v=>v&&v.toUpperCase()!=="N/A"&&!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.toUpperCase())?"Invalid IFSC — e.g. HDFC0001234":"",
  accountNumber:v=>v&&v.toUpperCase()!=="N/A"&&(v.length<9||v.length>18)?"Account number must be 9–18 digits":"",
  employeeId:v=>!v.trim()?"Employee ID is required":"",
};
const validate=(n:string,v:string)=>validators[n]?validators[n](v):"";

function Err({msg}:{msg?:string}){if(!msg)return null;return<p className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 mt-1"><AlertCircle size={12}/>{msg}</p>;}
function Ok({show}:{show?:boolean}){if(!show)return null;return<CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none"/>;}

function Field({label,name,value,onChange,onBlur,error,touched,type="text",placeholder,required,inputClass="",colSpan=""}:{
  label:string;name:string;value:string;onChange:(e:React.ChangeEvent<HTMLInputElement>)=>void;
  onBlur?:(e:React.FocusEvent<HTMLInputElement>)=>void;error?:string;touched?:boolean;
  type?:string;placeholder?:string;required?:boolean;inputClass?:string;colSpan?:string;
}){
  const hasErr=touched&&!!error,isOk=touched&&!error&&value.trim()!=="";
  return(
    <div className={`space-y-1.5 ${colSpan}`}>
      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">{label}{required&&<span className="text-rose-500 ml-0.5">*</span>}</label>
      <div className="relative">
        <input type={type} name={name} value={value} onChange={onChange} onBlur={onBlur} placeholder={placeholder}
          className={`w-full px-3 py-2 md:px-4 md:py-2.5 pr-9 border rounded-xl text-xs md:text-sm outline-none transition-all ${inputClass} ${hasErr?"border-rose-400 bg-rose-50/30 focus:ring-2 focus:ring-rose-400/20":isOk?"border-emerald-400 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-400/20":"border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/20"}`}/>
        <Ok show={isOk}/>
      </div>
      <Err msg={hasErr?error:undefined}/>
    </div>
  );
}

const CreateStaff = () => {
  const router = useRouter();
  const params = useParams() as any;
  const pathname = usePathname() as string;
  const basePath = pathname.includes('/hr') ? '/hr' : '/hospital-admin';
  const hospitalId = params.hospitalId as string;
  const queryClient=useQueryClient();
  const [shifts,setShifts]=useState<any[]>([]);
  const [availableDepts,setAvailableDepts]=useState<string[]>([]);
  const [formData,setFormData]=useState<FormData>({
    honorific: "Mr",
    name:"",email:"",mobile:"",password:"",gender:"",dateOfBirth:"",
    street:"",city:"",state:"",pincode:"",
    department:"",designation:"Staff",employeeId:"",employmentType:"full-time",experienceYears:"",joiningDate:"",
    emergencyContactName:"",emergencyContactMobile:"",emergencyContactRelationship:"",
    shift:"",startTime:"09:00",endTime:"17:00",weeklyOff:["Saturday","Sunday"],
    qualifications:[],certifications:[],skills:[],bloodGroup:"",languages:[],notes:"",
    sickLeaveQuota:"1",emergencyLeaveQuota:"1",status:"active",
    baseSalary:"0",panNumber:"",pfNumber:"",esiNumber:"",uanNumber:"",
    aadharNumber:"",fatherName:"",workLocation:"",
    bankDetails:{accountName:"",accountNumber:"",bankName:"",ifscCode:""}
  });
  const [errors,setErrors]=useState<Errors>({});
  const [touched,setTouched]=useState<Record<string,boolean>>({});
  const [tempQ,setTempQ]=useState("");const [tempC,setTempC]=useState("");const [tempS,setTempS]=useState("");
  const [showPwd,setShowPwd]=useState(false);const [loading,setLoading]=useState(false);

  React.useEffect(()=>{
    (async()=>{
      try{
        const[sd,td]=await Promise.all([hospitalAdminService.getShifts(),import('@/lib/integrations/services/ipd.service').then(m=>m.ipdService.getUnitTypes().catch(()=>[]))]);
        setShifts(sd);setAvailableDepts(td);
        if(sd.length>0)setFormData(p=>({...p,shift:sd[0]._id,startTime:sd[0].startTime,endTime:sd[0].endTime}));
        if(td.length>0)setFormData(p=>({...p,department:td[0]}));
      }catch{toast.error("Failed to load config");}
    })();
  },[]);

  const handleBlur=(n:string,v:string)=>{setTouched(p=>({...p,[n]:true}));setErrors(p=>({...p,[n]:validate(n,v)}));};
  const handleChange=(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>)=>{
    const{name,value}=e.target;
    if(name==="mobile"&&!/^\d{0,10}$/.test(value))return;
    if(name==="pincode"&&!/^\d{0,6}$/.test(value))return;
    if(name==="emergencyContactMobile"&&!/^\d{0,10}$/.test(value))return;
    if(name==="aadharNumber"&&value.toUpperCase()!=="N/A"&&!/^\d{0,12}$/.test(value))return;
    if(name==="panNumber"&&value.toUpperCase()!=="N/A"&&value.length>10)return;
    if (["sickLeaveQuota","emergencyLeaveQuota","baseSalary","experienceYears"].includes(name)&&value.toUpperCase()!=="N/A"&&!/^\d*$/.test(value)) return;
    if (name === "shift") { const s = shifts.find(s => s._id === value); if (s) { setFormData(p => ({ ...p, shift: value, startTime: s.startTime, endTime: s.endTime })); return; } }

    if (name === "honorific") {
      let gender = formData.gender;
      if (value === "Mr") gender = "male";
      else if (value === "Mrs" || value === "Ms") gender = "female";
      setFormData(prev => ({ ...prev, [name]: value, gender }));
      if (touched[name]) setErrors(p => ({ ...p, [name]: validate(name, value) }));
      return;
    }

    setFormData(p => ({ ...p, [name]: (name === "panNumber" || value.toUpperCase() === "N/A") ? value.toUpperCase() : value }));
    if(touched[name])setErrors(p=>({...p,[name]:validate(name,value)}));
  };
  const handleBankChange=(e:React.ChangeEvent<HTMLInputElement>)=>{
    const{name,value}=e.target;
    if(name==="accountNumber"&&value.toUpperCase()!=="N/A"&&!/^\d{0,18}$/.test(value))return;
    if(name==="ifscCode"&&value.toUpperCase()!=="N/A"&&value.length>11)return;
    setFormData(p=>({...p,bankDetails:{...p.bankDetails,[name]:value.toUpperCase()==="N/A"?value.toUpperCase():value}}));
    if(touched[name])setErrors(p=>({...p,[name]:validate(name,value)}));
  };

  const markFinancialNA=()=>{
    setFormData(p=>({...p,
      baseSalary:"0",panNumber:"N/A",pfNumber:"N/A",esiNumber:"N/A",uanNumber:"N/A",aadharNumber:"N/A",
      bankDetails:{accountName:"N/A",accountNumber:"N/A",bankName:"N/A",ifscCode:"N/A"}}));
    toast.success("Financial fields marked as N/A");
  };
  const handleBankBlur=(n:string,v:string)=>{setTouched(p=>({...p,[n]:true}));setErrors(p=>({...p,[n]:validate(n,v)}));};
  const toggleDay=(day:string)=>setFormData(p=>({...p,weeklyOff:p.weeklyOff.includes(day)?p.weeklyOff.filter(d=>d!==day):[...p.weeklyOff,day]}));
  const addItem=(type:'qualification'|'certification'|'skill')=>{
    const vals:{[k:string]:string}={qualification:tempQ,certification:tempC,skill:tempS};
    const keysMap:{[k:string]:keyof FormData}={qualification:'qualifications',certification:'certifications',skill:'skills'};
    const v=vals[type],k=keysMap[type] as keyof Pick<FormData,'qualifications'|'certifications'|'skills'>;
    if(v&&!(formData[k] as string[]).includes(v)){
      setFormData(p=>({...p,[k]:[...(p[k] as string[]),v]}));
      if(type==='qualification')setTempQ("");else if(type==='certification')setTempC("");else setTempS("");
    }
  };
  const removeItem=(k:keyof Pick<FormData,'qualifications'|'certifications'|'skills'>,item:string)=>setFormData(p=>({...p,[k]:(p[k] as string[]).filter(i=>i!==item)}));

  const touchAll=()=>{
    const fields=["name","email","mobile","password","designation","employeeId","pincode","emergencyContactMobile","panNumber","aadharNumber","ifscCode","accountNumber"];
    const nt:Record<string,boolean>={},ne:Errors={};
    fields.forEach(f=>{nt[f]=true;const v=f==="ifscCode"?formData.bankDetails.ifscCode:f==="accountNumber"?formData.bankDetails.accountNumber:(formData as any)[f]??"";ne[f]=validate(f,v);});
    setTouched(p=>({...p,...nt}));setErrors(p=>({...p,...ne}));
    return Object.values(ne).every(e=>!e);
  };

  const handleSubmit=async(e:React.FormEvent)=>{
    e.preventDefault();
    if(!touchAll()){toast.error("Please fix the highlighted errors before submitting");return;}
    setLoading(true);
    try{
      await hospitalAdminService.createStaff({
        honorific:formData.honorific,
        name:formData.name.trim(),email:formData.email.trim(),mobile:formData.mobile,password:formData.password,
        gender:formData.gender||undefined,dateOfBirth:formData.dateOfBirth||undefined,
        address:formData.street||formData.city?{street:formData.street,city:formData.city,state:formData.state,pincode:formData.pincode,country:"India"}:undefined,
        department:formData.department.trim(),designation:formData.designation.trim(),
        employeeId:formData.employeeId.trim()||undefined,employmentType:formData.employmentType,
        experienceYears:formData.experienceYears?parseInt(formData.experienceYears):0,
        joiningDate:formData.joiningDate||new Date().toISOString().split('T')[0],
        emergencyContact:formData.emergencyContactName?{name:formData.emergencyContactName,mobile:formData.emergencyContactMobile,relationship:formData.emergencyContactRelationship}:undefined,
        shift:formData.shift,workingHours:{start:formData.startTime,end:formData.endTime},weeklyOff:formData.weeklyOff,
        qualifications:formData.qualifications,certifications:formData.certifications,skills:formData.skills,
        bloodGroup:formData.bloodGroup||undefined,languages:formData.languages,notes:formData.notes.trim()||undefined,
        sickLeaveQuota:parseInt(formData.sickLeaveQuota)||1,emergencyLeaveQuota:parseInt(formData.emergencyLeaveQuota)||1,
        baseSalary:parseInt(formData.baseSalary)||0,panNumber:formData.panNumber,pfNumber:formData.pfNumber,
        esiNumber:formData.esiNumber,uanNumber:formData.uanNumber,aadharNumber:formData.aadharNumber,
        fatherName:formData.fatherName,workLocation:formData.workLocation,bankDetails:formData.bankDetails,role:'staff'
      } as any);
      toast.success(`Staff "${formData.name}" created successfully!`,{duration:4000});
      queryClient.invalidateQueries({queryKey:['hospital-admin-staff']});
      queryClient.invalidateQueries({queryKey:['hospital-admin','dashboard']});
      router.push(`/${hospitalId}${basePath}/staff`);
    }catch(err:any){toast.error(err.message||"Failed to create staff",{duration:5000});}
    finally{setLoading(false);}
  };

  const f=(name:string)=>({name,value:(formData as any)[name]??"",onChange:handleChange,onBlur:(e:React.FocusEvent<HTMLInputElement>)=>handleBlur(name,e.target.value),error:errors[name],touched:touched[name]});
  const bCls=(n:string,v:string)=>touched[n]&&errors[n]?"border-rose-400 bg-rose-50/30 focus:ring-2 focus:ring-rose-400/20":touched[n]&&!errors[n]&&v?"border-emerald-400 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-400/20":"border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/20";

  return(
    <InfrastructureCheck>
      <div className="max-w-7xl mx-auto pb-12 space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 md:p-6 border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={()=>router.push(`/${hospitalId}${basePath}/staff`)} className="p-2 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-all"><ArrowLeft size={16}/></button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Add New Staff Member</h1>
              <p className="text-gray-500 text-xs mt-0.5">Fields marked <span className="text-rose-500">*</span> are required.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card title="Personal Information" icon={<User className="text-blue-500"/>} padding="p-2 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Honorific<span className="text-rose-500 ml-0.5">*</span></label>
                  <select name="honorific" value={formData.honorific} onChange={handleChange} required className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all">
                    <option value="Mr">Mr</option><option value="Mrs">Mrs</option><option value="Ms">Ms</option><option value="Dr">Dr</option>
                  </select>
                </div>
                <Field label="Full Name" {...f("name")} required placeholder="e.g. Amit Sharma"/>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all">
                    <option value="">Select Gender</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                  </select>
                </div>
                <Field label="Email Address" {...f("email")} required type="email" placeholder="staff@hospital.com"/>
                <Field label="Mobile Number" {...f("mobile")} required type="tel" placeholder="10-digit number"/>
                <Field label="Father's Name" {...f("fatherName")} placeholder="Optional"/>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Date of Birth</label>
                  <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} max={new Date().toISOString().split('T')[0]} className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"/>
                </div>
                <Field label="Work Location" {...f("workLocation")} placeholder="e.g. Ward 2"/>
                <div className="relative space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Password<span className="text-rose-500 ml-0.5">*</span></label>
                  <div className="relative">
                    <input type={showPwd?"text":"password"} name="password" value={formData.password} onChange={handleChange} onBlur={e=>handleBlur("password",e.target.value)} placeholder="Min 6 characters" className={`w-full px-4 py-2.5 pr-10 border rounded-xl text-sm outline-none transition-all ${bCls("password",formData.password)}`}/>
                    <button type="button" onClick={()=>setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors">{showPwd?<EyeOff size={16}/>:<Eye size={16}/>}</button>
                  </div>
                  <Err msg={touched.password?errors.password:undefined}/>
                  {touched.password&&!errors.password&&formData.password&&<p className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-1"><CheckCircle2 size={12}/>Password looks good</p>}
                </div>
              </div>
            </Card>

            <Card title="Employment Details" icon={<Briefcase className="text-indigo-500"/>} padding="p-2 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Department<span className="text-rose-500 ml-0.5">*</span></label>
                  <select name="department" value={formData.department} onChange={handleChange} className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all">
                    <option value="">Select Department</option>{availableDepts.map(d=><option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <Field label="Designation" {...f("designation")} required placeholder="e.g. Ward Boy, Technician"/>
                <Field label="Employee ID" {...f("employeeId")} required placeholder="Hospital Employee ID"/>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Contract Type</label>
                  <select name="employmentType" value={formData.employmentType} onChange={handleChange} className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer">
                    <option value="full-time">Full-Time</option><option value="part-time">Part-Time</option><option value="contract">Contract</option>
                  </select>
                </div>
              </div>
            </Card>

            <Card title="Shift Details" icon={<Clock className="text-amber-500"/>} padding="p-2 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Active Shift<span className="text-rose-500 ml-0.5">*</span></label>
                  <select name="shift" value={formData.shift} onChange={handleChange} className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer">
                    <option value="">Select Shift</option>{shifts.map((s:any)=><option key={s._id} value={s._id}>{s.name} [{s.startTime} - {s.endTime}]</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[["Start",formData.startTime],["End",formData.endTime]].map(([l,v])=>(
                    <div key={l} className="space-y-1.5"><label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">{l}</label><div className="px-4 py-2 bg-gray-50 dark:bg-white/5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-white/5">{v}</div></div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Weekly Off</h4>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(day=><button key={day} type="button" onClick={()=>toggleDay(day)} className={`px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border ${formData.weeklyOff.includes(day)?'bg-blue-600 text-white border-blue-600 shadow-sm':'bg-gray-50 dark:bg-white/5 text-gray-400 border-gray-100 dark:border-white/10 hover:border-blue-500/30'}`}>{day.substring(0,3)}</button>)}
                </div>
              </div>
            </Card>

            <Card
              title="Financial & Identity Details"
              icon={<CreditCard className="text-blue-600"/>}
              padding="p-2 md:p-6"
              extra={<button type="button" onClick={markFinancialNA} className="text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-all border border-indigo-100">Mark all as N/A</button>}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Base Salary</label>
                  <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">₹</span><input type="text" name="baseSalary" value={formData.baseSalary} onChange={handleChange} placeholder="e.g. 25000" className="w-full pl-7 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-bold text-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"/></div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">PAN Number</label>
                  <div className="relative"><input type="text" name="panNumber" value={formData.panNumber} onChange={handleChange} onBlur={e=>handleBlur("panNumber",e.target.value)} placeholder="ABCDE1234F" maxLength={10} className={`w-full px-4 py-2.5 pr-9 border rounded-xl text-sm uppercase font-bold outline-none transition-all ${bCls("panNumber",formData.panNumber)}`}/>{touched.panNumber&&!errors.panNumber&&formData.panNumber&&<CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500"/>}</div>
                  <Err msg={touched.panNumber?errors.panNumber:undefined}/>{!formData.panNumber&&<p className="text-[10px] text-gray-400 ml-1">Format: ABCDE1234F</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Aadhar Number</label>
                  <div className="relative"><input type="text" name="aadharNumber" value={formData.aadharNumber} onChange={handleChange} onBlur={e=>handleBlur("aadharNumber",e.target.value)} placeholder="12-digit Aadhar" className={`w-full px-4 py-2.5 pr-9 border rounded-xl text-sm font-bold outline-none transition-all ${bCls("aadharNumber",formData.aadharNumber)}`}/>{touched.aadharNumber&&!errors.aadharNumber&&formData.aadharNumber&&<CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500"/>}</div>
                  <Err msg={touched.aadharNumber?errors.aadharNumber:undefined}/>{!formData.aadharNumber&&<p className="text-[10px] text-gray-400 ml-1">Must be exactly 12 digits</p>}
                </div>
                <Field label="PF Number" {...f("pfNumber")} placeholder="PF Number"/>
                <Field label="ESI Number" {...f("esiNumber")} placeholder="ESI Number"/>
                <Field label="UAN Number" {...f("uanNumber")} placeholder="UAN Number"/>
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-gray-50 dark:border-white/5">
                  <div className="space-y-1.5"><label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Account Holder Name</label><input type="text" name="accountName" value={formData.bankDetails.accountName} onChange={handleBankChange} placeholder="Name as per bank" className="w-full px-4 py-2.5 uppercase bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"/></div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Account Number</label>
                    <div className="relative"><input type="text" name="accountNumber" value={formData.bankDetails.accountNumber} onChange={handleBankChange} onBlur={e=>handleBankBlur("accountNumber",e.target.value)} placeholder="9–18 digits" className={`w-full px-4 py-2.5 pr-9 border rounded-xl text-sm font-bold outline-none transition-all ${bCls("accountNumber",formData.bankDetails.accountNumber)}`}/>{touched.accountNumber&&!errors.accountNumber&&formData.bankDetails.accountNumber&&<CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500"/>}</div>
                    <Err msg={touched.accountNumber?errors.accountNumber:undefined}/>{!formData.bankDetails.accountNumber&&<p className="text-[10px] text-gray-400 ml-1">Must be 9 to 18 digits</p>}
                  </div>
                  <div className="space-y-1.5"><label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Bank Name</label><input type="text" name="bankName" value={formData.bankDetails.bankName} onChange={handleBankChange} placeholder="e.g. HDFC Bank" className="w-full px-4 py-2.5 uppercase bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"/></div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">IFSC Code</label>
                    <div className="relative"><input type="text" name="ifscCode" value={formData.bankDetails.ifscCode} onChange={handleBankChange} onBlur={e=>handleBankBlur("ifscCode",e.target.value)} placeholder="e.g. HDFC0001234" maxLength={11} className={`w-full px-4 py-2.5 pr-9 uppercase border rounded-xl text-sm font-bold outline-none transition-all ${bCls("ifscCode",formData.bankDetails.ifscCode)}`}/>{touched.ifscCode&&!errors.ifscCode&&formData.bankDetails.ifscCode&&<CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500"/>}</div>
                    <Err msg={touched.ifscCode?errors.ifscCode:undefined}/>{!formData.bankDetails.ifscCode&&<p className="text-[10px] text-gray-400 ml-1">Format: ABCD0123456</p>}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card title="Emergency Contact" icon={<Activity className="text-rose-500"/>} padding="p-2 md:p-6">
              <div className="space-y-4">
                <div className="space-y-1.5"><label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Full Name</label><input type="text" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleChange} placeholder="Contact person" className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"/></div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Mobile</label>
                  <div className="relative"><input type="tel" name="emergencyContactMobile" value={formData.emergencyContactMobile} onChange={handleChange} onBlur={e=>handleBlur("emergencyContactMobile",e.target.value)} placeholder="10-digit number" className={`w-full px-4 py-2.5 pr-9 border rounded-xl text-sm outline-none transition-all ${bCls("emergencyContactMobile",formData.emergencyContactMobile)}`}/>{touched.emergencyContactMobile&&!errors.emergencyContactMobile&&formData.emergencyContactMobile&&<CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500"/>}</div>
                  <Err msg={touched.emergencyContactMobile?errors.emergencyContactMobile:undefined}/>
                </div>
                <div className="space-y-1.5"><label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Relationship</label><input type="text" name="emergencyContactRelationship" value={formData.emergencyContactRelationship} onChange={handleChange} placeholder="e.g. Spouse / Parent" className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"/></div>
              </div>
            </Card>

            <Card title="Qualifications & Certifications" icon={<Globe className="text-indigo-500"/>} padding="p-2 md:p-6">
              <div className="space-y-6">
                {([{label:"Education / Degrees",temp:tempQ,setT:setTempQ,type:'qualification' as const,items:formData.qualifications,k:'qualifications' as const,ph:"e.g. MBBS, Diploma"},{label:"Certifications",temp:tempC,setT:setTempC,type:'certification' as const,items:formData.certifications,k:'certifications' as const,ph:"e.g. ACLS, BLS"}]).map(({label,temp,setT,type,items,k,ph})=>(
                  <div key={type} className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">{label}</label>
                    <div className="flex gap-2"><input type="text" value={temp} onChange={e=>setT(e.target.value)} onKeyDown={e=>e.key==='Enter'&&(e.preventDefault(),addItem(type))} placeholder={ph} className="flex-1 px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/10 outline-none"/><button type="button" onClick={()=>addItem(type)} className="p-2.5 bg-blue-600 text-white rounded-xl active:scale-90 transition-transform"><Plus size={16}/></button></div>
                    <div className="flex flex-wrap gap-2">{items.map(q=><button key={q} type="button" onClick={()=>removeItem(k,q)} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 transition-all">{q}<span>×</span></button>)}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Skills & Capacities" icon={<FileText className="text-blue-500"/>} padding="p-2 md:p-6">
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Add Skills</label>
                <div className="flex gap-2"><input type="text" value={tempS} onChange={e=>setTempS(e.target.value)} onKeyDown={e=>e.key==='Enter'&&(e.preventDefault(),addItem('skill'))} placeholder="e.g. Data Entry, Phlebotomy" className="flex-1 px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/10 outline-none"/><button type="button" onClick={()=>addItem('skill')} className="p-2.5 bg-blue-600 text-white rounded-xl active:scale-90 transition-transform"><Plus size={16}/></button></div>
                <div className="flex flex-wrap gap-2">{formData.skills.map(s=><button key={s} type="button" onClick={()=>removeItem('skills',s)} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 transition-all">{s}<span>×</span></button>)}</div>
              </div>
            </Card>

            <Card title="System Status" icon={<Activity className="text-blue-500"/>} padding="p-2 md:p-6">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Initial Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all">
                  <option value="active">Active</option><option value="inactive">Inactive</option>
                </select>
              </div>
            </Card>

            <div className="pt-4 sticky bottom-6 z-50">
              <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-2 md:py-3.5 bg-blue-600 text-white rounded-xl text-xs md:text-sm font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-500/20">
                {loading?<div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>:<><Plus size={18}/>Create Staff Record</>}
              </button>
              <button type="button" onClick={()=>router.push(`/${hospitalId}${basePath}/staff`)} disabled={loading} className="w-full mt-3 py-2 md:py-3 text-[10px] md:text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors">Cancel Registration</button>
            </div>
          </div>
        </form>
      </div>
    </InfrastructureCheck>
  );
};

export default React.memo(CreateStaff);
