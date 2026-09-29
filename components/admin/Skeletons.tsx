
import React from "react";

export const RegistrySkeleton = ({ count = 6, gridCol =3 }: { count?: number; gridCol?: number }) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${gridCol} gap-6`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-100 rounded-lg w-3/4"></div>
              <div className="h-3 bg-slate-50 rounded-lg w-1/2"></div>
            </div>
          </div>
          <div className="space-y-3 pt-4">
            <div className="h-3 bg-slate-50 rounded-lg w-full"></div>
            <div className="h-3 bg-slate-50 rounded-lg w-5/6"></div>
            <div className="h-3 bg-slate-50 rounded-lg w-2/3"></div>
          </div>
          <div className="flex gap-2 pt-4">
            <div className="h-10 bg-slate-50 rounded-xl flex-1"></div>
            <div className="h-10 bg-slate-50 rounded-xl w-10"></div>
            <div className="h-10 bg-slate-50 rounded-xl w-10"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden animate-pulse">
      <div className="h-12 bg-slate-50 border-b border-slate-100"></div>
      <div className="divide-y divide-slate-50">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-6 py-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-100 rounded-xl"></div>
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-slate-100 rounded-lg w-1/4"></div>
              <div className="h-2 bg-slate-50 rounded-lg w-1/6"></div>
            </div>
            <div className="w-24 h-6 bg-slate-50 rounded-full"></div>
            <div className="w-32 h-6 bg-slate-50 rounded-full ml-auto"></div>
          </div>
        ))}
      </div>
    </div>
  );
};
