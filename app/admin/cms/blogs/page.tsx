'use client';

import React, { useEffect, useState } from 'react';
import { contentService } from '@/lib/integrations/services/content.service';
import { Blog, CreateBlogRequest } from '@/lib/integrations/types/cms';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Type,
  ImageIcon,
  Layout,
  Tag as TagIcon,
  ChevronRight,
  Monitor,
  Calendar,
  Sparkles,
  User,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ImageCropper from '@/components/ui/ImageCropper';

const ManageBlogs = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'settings' | 'preview'>('content');

  // Image Cropper State
  const [showCropper, setShowCropper] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // Form State
  const [formData, setFormData] = useState<CreateBlogRequest>({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    category: 'General',
    tags: [],
    status: 'draft',
    featuredImage: ''
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const data = await contentService.getAdminBlogs();
      setBlogs(data);
    } catch (error) {
      console.error('Error fetching blogs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const handleEdit = (blog: Blog) => {
    setEditingBlog(blog);
    setFormData({
      title: blog.title,
      slug: blog.slug,
      content: blog.content,
      excerpt: blog.excerpt,
      category: blog.category,
      tags: blog.tags,
      status: blog.status,
      featuredImage: blog.featuredImage || ''
    });
    setIsModalOpen(true);
    setActiveTab('content');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article? This action cannot be undone.')) return;
    try {
      await contentService.deleteBlog(id);
      fetchBlogs();
    } catch (error) {
      alert('Failed to delete article');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('headline is required to publish.');
      setActiveTab('content');
      return;
    }
    if (!formData.content.trim()) {
      alert('Article content cannot be empty.');
      setActiveTab('content');
      return;
    }

    setSubmitting(true);
    try {
      if (editingBlog) {
        await contentService.updateBlog(editingBlog._id, formData);
      } else {
        await contentService.createBlog(formData);
      }
      setIsModalOpen(false);
      fetchBlogs();
      resetForm();
    } catch (error: any) {
      alert(error.message || 'Failed to save article');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      slug: '',
      content: '',
      excerpt: '',
      category: 'General',
      tags: [],
      status: 'draft',
      featuredImage: ''
    });
    setEditingBlog(null);
    setTagInput('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPendingImage(event.target?.result as string);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCrop = async (croppedImage: string) => {
    setIsUploadingImage(true);
    try {
      // In a real app we might upload to S3/Cloudinary here
      setFormData({ ...formData, featuredImage: croppedImage });
      setShowCropper(false);
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Failed to process image');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const filteredBlogs = blogs.filter(b =>
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto overflow-x-hidden md:px-0">
      {/* Premium Header + Modern Stats Unified */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 py-4 border-b border-slate-100">
        <div className="space-y-1 px-2">
          <div className="flex items-center gap-2 text-primary-theme font-black text-[10px] uppercase tracking-[0.3em]">
            <div className="w-8 h-[1.5px] bg-primary-theme" />
            Content Management
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tighter italic leading-none">
            Article <span className="text-primary-theme underline decoration-primary-theme/20 underline-offset-8">Studio</span>
          </h1>
          <p className="text-slate-500 font-medium text-[11px] md:text-xs max-w-md leading-tight mt-2">
            Craft, curate, and publish medical breakthroughs to the global network.
          </p>
        </div>

        {/* Stats on the same level as title on large screens */}
        <div className="flex flex-wrap items-center gap-2 px-2 md:px-0">
          {[
            { label: 'Published', val: blogs.filter(b => b.status === 'published').length, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
            { label: 'Drafts', val: blogs.filter(b => b.status === 'draft').length, icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50' },
            { label: 'Readers', val: '2.4k', icon: Sparkles, color: 'text-purple-500', bg: 'bg-purple-50' },
            { label: 'Avg.', val: '84%', icon: Layout, color: 'text-blue-500', bg: 'bg-blue-50' },
          ].map((stat, i) => (
            <div key={i} className="bg-white px-4 py-2 rounded-2xl border border-slate-200 flex items-center gap-3 shadow-sm flex-1 min-w-[120px] md:min-w-0 md:flex-none">
              <div className={`w-8 h-8 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center shrink-0`}>
                <stat.icon size={16} />
              </div>
              <div>
                <p className="text-slate-400 text-[8px] font-black uppercase tracking-widest">{stat.label}</p>
                <p className="text-sm font-black text-slate-900 leading-tight">{stat.val}</p>
              </div>
            </div>
          ))}

          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
              setActiveTab('content');
            }}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl text-xs font-black hover:bg-primary-theme transition-all shadow-xl active:scale-95 group flex-1 md:flex-none justify-center"
          >
            <Plus size={18} />
            Draft Story
          </button>
        </div>
      </div>

      {/* Interactive Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-3 py-3 border-b border-slate-100 bg-slate-50/30 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Quick filter..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-theme/10 focus:border-primary-theme transition-all outline-none font-bold text-xs shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Story Info</th>
                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Metadata</th>
                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Timeline</th>
                <th className="px-5 py-3 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Tools</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [1, 2, 3].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-8 py-10 h-24 bg-slate-50/30" />
                  </tr>
                ))
              ) : filteredBlogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center gap-6">
                      <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center text-slate-200">
                        <FileText size={48} />
                      </div>
                      <div className="max-w-xs space-y-2">
                        <p className="text-xl font-black text-slate-900">Desk is empty</p>
                        <p className="text-slate-500 font-medium">No articles matched your current workspace filter. Clear search or draft a new story.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filteredBlogs.map((blog) => (
                <tr key={blog._id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-16 h-10 shrink-0 rounded-lg overflow-hidden shadow-sm border border-slate-100">
                        <img
                          src={blog.featuredImage || 'https://via.placeholder.com/150x100?text=No+Image'}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          alt=""
                        />
                      </div>
                      <div className="max-w-[200px]">
                        <p className="font-black text-slate-900 group-hover:text-primary-theme transition-colors line-clamp-1 text-sm leading-tight uppercase tracking-tight italic">
                          {blog.title}
                        </p>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
                          <Layout size={8} /> {blog.slug}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="w-fit text-[8px] font-black uppercase tracking-widest text-primary-theme bg-primary-theme/5 px-2 py-0.5 rounded-md">
                        {blog.category}
                      </span>
                      <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                        <User size={8} /> {blog.author}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${blog.status === 'published'
                        ? 'bg-green-50 text-green-600 border border-green-100'
                        : 'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${blog.status === 'published' ? 'bg-green-600' : 'bg-amber-600'} animate-pulse`} />
                      {blog.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col">
                      <p className="text-xs font-black text-slate-900 leading-none">{new Date(blog.createdAt).toLocaleDateString(undefined, { month: 'short', day: '2-digit' })}</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Year {new Date(blog.createdAt).getFullYear()}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        className="p-2 bg-white hover:bg-slate-900 hover:text-white rounded-lg text-slate-400 border border-slate-100 transition-all group/tool"
                        onClick={() => window.open(`/blogs/${blog.slug}`, '_blank')}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handleEdit(blog)}
                        className="p-2 bg-white hover:bg-primary-theme hover:text-white rounded-lg text-slate-400 border border-slate-100 transition-all group/tool"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(blog._id)}
                        className="p-2 bg-white hover:bg-red-500 hover:text-white rounded-lg text-slate-400 border border-slate-100 transition-all group/tool"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Premium Full-Screen Modal Editor */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ x: -150, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 150, opacity: 0 }}
              transition={{
                type: "spring",
                damping: 28,
                stiffness: 260,
                mass: 1,
                velocity: 2,
                opacity: { duration: 0.4 }
              }}
              className="relative w-[calc(100%-2rem)] h-[95%] lg:w-[calc(100%-20rem)] lg:h-[90%] lg:ml-56 lg:rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col mx-auto lg:mx-4"
            >
              <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
                {/* Editor Toolbar */}
                <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-white/80 backdrop-blur-md sticky top-0 z-20">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-300">
                      <FileText size={18} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight italic leading-none">
                        {editingBlog ? 'Refining Article' : 'Drafting Masterpiece'}
                      </h2>
                      <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mt-1">
                        {activeTab === 'preview' ? 'Verification Layer' : 'Studio Environment'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center bg-slate-100/50 p-1 rounded-xl border border-slate-100">
                    {[
                      { id: 'content', icon: Type, label: 'Editor' },
                      { id: 'settings', icon: Layout, label: 'Metadata' },
                      { id: 'preview', icon: Monitor, label: 'Preview' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                            ? 'bg-white text-slate-900 shadow-md border border-slate-100'
                            : 'text-slate-400 hover:text-slate-600'
                          }`}
                      >
                        <tab.icon size={12} /> {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 rounded-lg font-bold text-slate-400 hover:bg-slate-50 uppercase text-[9px] tracking-widest transition-all hover:text-red-500"
                    >
                      Discard
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center gap-2 bg-primary-theme text-white px-6 py-2 rounded-xl text-xs font-black shadow-lg shadow-primary-theme/10 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {submitting ? <Loader2 size={14} className="animate-spin" /> : editingBlog ? 'Update' : 'Publish'}
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                {/* Editor Workspace */}
                <div className="flex-1 overflow-y-auto bg-slate-50/10">
                  <div className="w-full h-full p-2 md:p-4">
                    {activeTab === 'content' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                      >
                        {/* Giant Title Input */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Headline</label>
                          <input
                            required
                            autoFocus
                            className="w-full bg-transparent border-none text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 italic tracking-tighter"
                            placeholder="Story headline..."
                            value={formData.title}
                            onChange={(e) => {
                              const title = e.target.value;
                              const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                              setFormData({ ...formData, title, slug });
                            }}
                          />
                        </div>

                        {/* Editor Area */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                          <div className="lg:col-span-8 space-y-4">
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
                              <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                                <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                  <FileText size={14} className="text-primary-theme" /> Editorial Workspace
                                </label>
                                <div className="flex items-center gap-2">
                                  <Layout size={10} className="text-slate-300" />
                                  <input
                                    className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded border-none outline-none"
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                    placeholder="url-slug"
                                  />
                                </div>
                              </div>
                              <textarea
                                required
                                className="w-full min-h-[300px] md:min-h-[400px] bg-transparent border-none outline-none font-medium text-sm md:text-base text-slate-800 leading-relaxed placeholder:text-slate-200 no-scrollbar"
                                placeholder="Start typing..."
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                              />
                            </div>
                          </div>

                          <div className="lg:col-span-4 space-y-4">
                            {/* Featured Image Premium Preview */}
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                              <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                  <ImageIcon size={12} /> Art Direction
                                </span>
                              </div>
                              <div className="p-5 space-y-4">
                                <div className="w-full rounded-xl bg-slate-50 border-2 border-dashed border-slate-100 flex items-center justify-center relative group overflow-hidden">
                                  {formData.featuredImage ? (
                                    <img src={formData.featuredImage} className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
                                  ) : (
                                    <div className="text-center space-y-1">
                                      <ImageIcon size={24} className="mx-auto text-slate-200" />
                                      <p className="text-[8px] font-bold text-slate-300 uppercase">Art Placeholder</p>
                                    </div>
                                  )}
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/40 backdrop-blur-sm">
                                    <label className="cursor-pointer bg-white text-slate-900 px-4 py-2 rounded-xl text-[10px] font-black shadow-xl border border-slate-100 flex items-center gap-2 transform transition-transform hover:scale-110 active:scale-95">
                                      <Upload size={14} /> Change Cover
                                      <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                      />
                                    </label>
                                  </div>
                                </div>
                                <div className="relative">
                                  <input
                                    className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl font-bold text-[10px] outline-none transition-all focus:ring-2 focus:ring-primary-theme/10"
                                    placeholder="Or paste cover URL..."
                                    value={formData.featuredImage}
                                    onChange={(e) => setFormData({ ...formData, featuredImage: e.target.value })}
                                  />
                                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <Upload size={12} className="text-slate-300" />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Excerpt Card */}
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Sparkles size={12} className="text-primary-theme" /> Hook Summary
                              </label>
                              <textarea
                                className="w-full bg-slate-50 border border-slate-100 p-4 rounded-xl font-medium text-[11px] outline-none min-h-[100px] leading-snug italic"
                                placeholder="Catchy summary..."
                                value={formData.excerpt}
                                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'settings' && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="w-full py-2 md:py-4"
                      >
                        <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-xl p-4 md:p-8 space-y-8">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                            <div className="space-y-4">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Display Category</label>
                              <div className="grid grid-cols-2 gap-3">
                                {['Technology', 'General', 'Healthcare', 'Research', 'Updates'].map(cat => (
                                  <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, category: cat })}
                                    className={`py-4 rounded-2xl font-bold text-xs transition-all ${formData.category === cat
                                        ? 'bg-primary-theme text-white shadow-lg'
                                        : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                      }`}
                                  >
                                    {cat}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-4">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Workflow Status</label>
                              <div className="flex flex-col gap-4">
                                {['draft', 'published'].map(s => (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, status: s as any })}
                                    className={`p-6 rounded-[2rem] border-2 transition-all text-left flex items-center justify-between ${formData.status === s
                                        ? 'border-primary-theme bg-primary-theme/5'
                                        : 'border-slate-50 bg-slate-50/50'
                                      }`}
                                  >
                                    <div>
                                      <p className={`font-black uppercase tracking-widest text-xs ${formData.status === s ? 'text-primary-theme' : 'text-slate-400'}`}>{s}</p>
                                      <p className="text-[10px] font-medium text-slate-400 mt-1">
                                        {s === 'draft' ? 'Only visible to the admin team.' : 'Propagated to public landing hubs.'}
                                      </p>
                                    </div>
                                    {formData.status === s && <CheckCircle2 className="text-primary-theme" size={24} />}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 flex items-center gap-2">
                              <TagIcon size={14} /> Search Tags & Keywords
                            </label>
                            <div className="flex flex-wrap gap-4 p-8 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100">
                              {formData.tags?.map(t => (
                                <span key={t} className="px-5 py-2.5 rounded-xl bg-white text-slate-900 font-bold text-xs shadow-sm flex items-center gap-3">
                                  {t} <button type="button" onClick={() => setFormData({ ...formData, tags: formData.tags?.filter(tag => tag !== t) })}>&times;</button>
                                </span>
                              ))}
                              <input
                                className="flex-1 bg-transparent border-none outline-none font-bold text-sm text-slate-900 placeholder:text-slate-200"
                                placeholder="Type and press Enter or comma..."
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ',') {
                                    e.preventDefault();
                                    const val = tagInput.trim().replace(/,$/, '');
                                    if (val && !formData.tags?.includes(val)) {
                                      setFormData({ ...formData, tags: [...(formData.tags || []), val] });
                                    }
                                    setTagInput('');
                                  }
                                }}
                                onBlur={() => {
                                  const val = tagInput.trim();
                                  if (val && !formData.tags?.includes(val)) {
                                    setFormData({ ...formData, tags: [...(formData.tags || []), val] });
                                    setTagInput('');
                                  }
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'preview' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full py-2 md:py-4"
                      >
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden min-h-[500px]">
                          <div className="h-1 bg-primary-theme" />
                          <div className="p-8 md:p-12 space-y-6">
                            <div className="space-y-4">
                              <div className="flex items-center gap-2">
                                <span className="px-3 py-1 rounded-full bg-primary-theme/5 text-primary-theme text-[9px] font-black uppercase tracking-widest">
                                  {formData.category}
                                </span>
                              </div>
                              <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter italic leading-tight">
                                {formData.title || 'Draft Headline'}
                              </h1>
                            </div>

                            {formData.featuredImage && (
                              <div className="w-full rounded-xl overflow-hidden shadow-sm">
                                <img src={formData.featuredImage} className="w-full h-auto block" />
                              </div>
                            )}

                            <div className="flex items-center gap-3 py-4 border-y border-slate-100">
                              <div className="w-8 h-8 rounded-lg bg-slate-100" />
                              <div>
                                <p className="text-xs font-black text-slate-900 leading-none">System Admin</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 mt-1">
                                  <Calendar size={8} /> {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-6">
                              <p className="text-lg font-black text-slate-900 italic leading-snug opacity-60">
                                {formData.excerpt || 'Summary goes here.'}
                              </p>
                              <div className="text-sm text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
                                {formData.content || 'Content drafting...'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Cropper Modal */}
      {showCropper && pendingImage && (
        <ImageCropper
          src={pendingImage}
          onCrop={handleCrop}
          onCancel={() => setShowCropper(false)}
          aspectRatio={16 / 9}
          isUploading={isUploadingImage}
        />
      )}
    </div>
  );
};

export default ManageBlogs;
