'use client';

import React, { useEffect, useState } from 'react';
import { contentService } from '@/lib/integrations/services/content.service';
import { Testimonial, CreateTestimonialRequest } from '@/lib/integrations/types/cms';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Quote,
  Star,
  Loader2,
  CheckCircle2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ManageTestimonials = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Testimonial | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Form State
  const [formData, setFormData] = useState<CreateTestimonialRequest>({
    name: '',
    designation: '',
    company: '',
    content: '',
    avatar: '',
    rating: 5,
    status: 'active'
  });

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await contentService.getAdminTestimonials();
      setTestimonials(data);
    } catch (error) {
      console.error('Error fetching testimonials:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleEdit = (item: Testimonial) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      designation: item.designation,
      company: item.company || '',
      content: item.content,
      avatar: item.avatar || '',
      rating: item.rating,
      status: item.status
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this testimonial?')) return;
    try {
      await contentService.deleteTestimonial(id);
      fetchItems();
    } catch (error) {
      alert('Failed to delete testimonial');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingItem) {
        await contentService.updateTestimonial(editingItem._id, formData);
      } else {
        await contentService.createTestimonial(formData);
      }
      setIsModalOpen(false);
      fetchItems();
      resetForm();
    } catch (error) {
      alert('Failed to save testimonial');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      designation: '',
      company: '',
      content: '',
      avatar: '',
      rating: 5,
      status: 'active'
    });
    setEditingItem(null);
  };

  const filteredItems = testimonials.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.company?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const testimonialStatuses: ("active" | "inactive")[] = ["active", "inactive"];

  return (
    <div className="space-y-4 max-w-7xl mx-auto overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 w-full">
        <div className="space-y-1 shrink-0">
          <h1 className="text-lg md:text-xl lg:text-2xl font-black text-slate-900 tracking-tight leading-none uppercase italic">Testimonials</h1>
          <p className="text-slate-500 font-medium text-[11px]">Manage social proof and success stories.</p>
        </div>

        <div className="flex flex-1 items-center justify-end gap-4 w-full md:w-auto min-w-0">
          <div className="relative flex-1 max-w-3xl transition-all group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-theme transition-colors" size={16} />
            <input
              type="text"
              placeholder="Search testimonials..."
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary-theme/5 focus:border-primary-theme transition-all outline-none font-bold text-[10px] md:text-sm lg:text-base placeholder:text-slate-300 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-xl shadow-slate-900/10 active:scale-95 shrink-0 hover:bg-primary-theme transition-all"
          >
            <Plus size={16} /> New
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 animate-pulse h-40" />
          ))
        ) : filteredItems.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200">
            <Quote size={32} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-900 font-bold text-lg">No testimonials yet</p>
            <p className="text-slate-500 text-xs">Share a success story.</p>
          </div>
        ) : filteredItems.map((item) => (
          <motion.div
            layout
            key={item._id}
            className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-primary-theme/30 transition-all flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1 text-yellow-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={12} className={i < item.rating ? 'fill-yellow-500' : 'text-slate-200'} />
                ))}
              </div>
              <div className="flex items-center gap-1.5 opacity-100 transition-opacity">
                <button onClick={() => handleEdit(item)} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 border border-slate-100 transition-colors">
                  <Edit2 size={12} />
                </button>
                <button onClick={() => handleDelete(item._id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 border border-slate-100 transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            <blockquote className="text-slate-600 font-medium italic mb-5 flex-1 leading-snug text-xs">
              "{item.content}"
            </blockquote>

            <div className="flex items-center gap-3">
              <img
                src={item.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random`}
                className="w-10 h-10 rounded-xl object-cover bg-slate-100 shadow-sm"
                alt=""
              />
              <div>
                <p className="font-black text-slate-900 text-sm group-hover:text-primary-theme transition-colors leading-none uppercase italic">{item.name}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  {item.designation} {item.company && `@ ${item.company}`}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className={`text-[8px] font-black uppercase tracking-widest ${item.status === 'active' ? 'text-green-500' : 'text-slate-400'}`}>
                {item.status}
              </span>
              <p className="text-[8px] text-slate-300 font-medium">{new Date(item.createdAt).toLocaleDateString()}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Edit/Create Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden h-[85%] flex flex-col mx-4"
            >
              <div className="px-8 md:px-12 py-6 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
                <div>
                  <h2 className="text-xl font-black text-slate-900 leading-none underline decoration-primary-theme/20 underline-offset-4 italic tracking-tight">{editingItem ? 'Edit Testimonial' : 'New Testimonial'}</h2>
                  <p className="text-slate-500 text-xs font-medium mt-2">Capture a success story.</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-10 h-10 rounded-2xl hover:bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 transition-all shadow-sm"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 md:px-12 py-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2 md:col-span-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Name</label>
                    <input
                      required
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-theme/10 transition-all outline-none font-bold text-xs"
                      placeholder="e.g. Sarah Johnson"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5 col-span-2 md:col-span-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Role</label>
                    <input
                      required
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-theme/10 transition-all outline-none font-bold text-xs"
                      placeholder="e.g. Lead Surgeon"
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5 col-span-2 md:col-span-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Organization</label>
                    <input
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-theme/10 transition-all outline-none font-bold text-xs"
                      placeholder="e.g. Metro Hospital"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5 col-span-2 md:col-span-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Avatar (URL)</label>
                    <input
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-theme/10 transition-all outline-none font-bold text-xs"
                      placeholder="Link (optional)"
                      value={formData.avatar}
                      onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Rating</label>
                    <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      {[1, 2, 3, 4, 5].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setFormData({ ...formData, rating: r })}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${(formData.rating ?? 0) >= r ? 'bg-yellow-100 text-yellow-500 shadow-sm border border-yellow-200' : 'text-slate-300'
                            }`}
                        >
                          <Star size={16} className={(formData.rating ?? 0) >= r ? 'fill-yellow-500' : ''} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 md:col-span-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Status</label>
                    <div className="flex gap-1.5">
                      {testimonialStatuses.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setFormData({ ...formData, status: s })}
                          className={`flex-1 py-2 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all border ${formData.status === s
                              ? 'bg-primary-theme text-white border-primary-theme shadow-md shadow-primary-theme/10'
                              : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'
                            }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Message</label>
                    <textarea
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-theme/10 transition-all outline-none font-medium text-xs min-h-[100px] leading-relaxed"
                      placeholder="Shared experience..."
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    />
                  </div>
                </div>
              </form>

              <div className="px-8 md:px-12 py-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl font-black text-slate-400 hover:text-slate-600 uppercase text-[10px] tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  disabled={submitting}
                  onClick={handleSubmit}
                  className="flex items-center gap-2 bg-slate-900 text-white px-8 py-2.5 rounded-xl text-[11px] font-black hover:bg-primary-theme transition-all shadow-xl shadow-slate-900/10 active:scale-95 disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : editingItem ? 'Save Updates' : 'Add Testimonial'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ManageTestimonials;
