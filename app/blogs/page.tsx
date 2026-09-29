'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Calendar, 
  ArrowRight, 
  Clock, 
  BookOpen
} from 'lucide-react';
import LandingNavbar from "@/components/navbar/LandingNavbar";
import Footer from "@/components/footer/Footer";
import { contentService } from '@/lib/integrations/services/content.service';
import { Blog } from '@/lib/integrations/types/cms';
import Link from 'next/link';

const BlogsPage = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const data = await contentService.getPublicBlogs();
        setBlogs(data);
      } catch (error) {
        console.error('Error fetching blogs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBlogs();
  }, []);

  const categories = ['All', ...Array.from(new Set(blogs.map(b => b.category)))];

  const filteredBlogs = blogs.filter(b => {
    const matchesSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         b.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || b.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-50/50 selection:bg-primary-theme/10 selection:text-primary-theme text-left">
      <LandingNavbar variant="detail" />
      
      <main className="pt-24 pb-20">
        {/* Compact Header */}
         <section className="px-6 mb-12">
          <div className="max-w-7xl mx-auto text-center space-y-4">
             <div className="flex items-center justify-center gap-3 text-primary-theme font-black text-[9px] md:text-[11px] uppercase tracking-[0.4em]">
               <div className="w-8 h-px bg-primary-theme/30" />
               Knowledge Base
               <div className="w-8 h-px bg-primary-theme/30" />
             </div>
             <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight italic uppercase leading-none">
               Medical <span className="text-primary-theme underline decoration-primary-theme/10 underline-offset-4">Insights</span> & Studies
             </h1>
             <p className="text-slate-500 font-medium max-w-2xl mx-auto text-xs md:text-sm lg:text-base leading-relaxed">
               Latest clinical studies and medical breakthroughs from our global MSCureChain laboratory network.
             </p>
          </div>
        </section>

        {/* Tight Filter Bar */}
        <section className="px-6 mb-12 sticky top-[72px] z-40">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 bg-white/90 backdrop-blur-xl p-3 md:p-4 rounded-2xl border border-slate-100 shadow-2xl shadow-slate-200/40">
            <div className="flex items-center gap-4 md:gap-6 overflow-x-auto no-scrollbar w-full md:w-auto px-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-[10px] md:text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all relative py-2 ${
                    selectedCategory === cat ? 'text-primary-theme' : 'text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {cat}
                  {selectedCategory === cat && (
                    <motion.div layoutId="activeCat" className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary-theme" />
                  )}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-80 lg:w-[400px] group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary-theme transition-colors" size={16} />
              <input
                type="text"
                placeholder="Search articles..."
                className="w-full bg-slate-50/50 border border-slate-100 pl-12 pr-4 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-bold placeholder:text-slate-300 focus:bg-white focus:ring-4 focus:ring-primary-theme/5 focus:border-primary-theme transition-all outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Scaled Blog Grid */}
        <section className="px-6">
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="animate-pulse space-y-4">
                     <div className="aspect-video bg-slate-200/60 rounded-2xl" />
                     <div className="h-4 bg-slate-200/60 rounded-lg w-3/4" />
                     <div className="h-3 bg-slate-200/60 rounded-lg w-full" />
                  </div>
                ))}
              </div>
            ) : filteredBlogs.length === 0 ? (
              <div className="py-24 text-center bg-white rounded-3xl border border-slate-100 shadow-sm transition-all">
                 <BookOpen size={48} className="mx-auto text-slate-200 mb-6" />
                 <h3 className="text-xl font-black text-slate-900 uppercase italic">No records found</h3>
                 <p className="text-slate-400 font-medium text-sm mt-2">Try another keyword or category filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {filteredBlogs.map((blog, idx) => (
                  <motion.article 
                    key={blog._id}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx % 3 * 0.1 }}
                    className="group bg-white rounded-3xl border border-slate-100 overflow-hidden hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-500 flex flex-col h-full"
                  >
                    <Link href={`/blogs/${blog.slug}`} className="block relative aspect-video overflow-hidden">
                      <img 
                        src={blog.featuredImage || 'https://images.unsplash.com/photo-1576091160550-2173dba9697a?auto=format&fit=crop&q=80&w=800'} 
                        alt={blog.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute top-4 left-4">
                         <span className="px-3 py-1 rounded-lg bg-white/95 backdrop-blur-md text-slate-900 text-[10px] font-black uppercase tracking-widest shadow-md">
                           {blog.category}
                         </span>
                      </div>
                    </Link>

                    <div className="p-6 md:p-8 flex flex-col flex-1">
                      <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-primary-theme" /> {new Date(blog.publishedAt || blog.createdAt).toLocaleDateString()}
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-100" />
                        <span className="flex items-center gap-1.5">
                          <Clock size={12} className="text-primary-theme" /> 5 MIN READ
                        </span>
                      </div>
                      
                      <Link href={`/blogs/${blog.slug}`}>
                        <h2 className="text-lg md:text-xl font-black text-slate-900 leading-tight tracking-tight mb-3 group-hover:text-primary-theme transition-colors line-clamp-2 italic uppercase">
                          {blog.title}
                        </h2>
                      </Link>
                      
                      <p className="text-slate-500 font-medium text-xs md:text-sm leading-relaxed line-clamp-3 mb-6">
                        {blog.excerpt}
                      </p>

                      <Link 
                        href={`/blogs/${blog.slug}`}
                        className="mt-auto inline-flex items-center gap-2 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-primary-theme transition-all"
                      >
                        Explore Article 
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </motion.article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default BlogsPage;
