'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { contentService } from '@/lib/integrations/services/content.service';
import { Blog } from '@/lib/integrations/types/cms';
import Link from 'next/link';

const LandingBlogs = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const data = await contentService.getPublicBlogs();
        setBlogs(data.slice(0, 4)); // Updated to show top 4
      } catch (error) {
        console.error('Error fetching blogs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBlogs();
  }, []);

  if (!loading && blogs.length === 0) return null;

  return (
    <section className="py-16 bg-white relative overflow-hidden border-t border-slate-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div className="max-w-xl text-left">
             <div className="flex items-center gap-2 text-primary-theme font-black text-[8px] uppercase tracking-[0.3em] mb-3">
               <div className="w-6 h-px bg-primary-theme/30" />
               Knowledge Base
             </div>
             <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase">
               Medical <span className="text-primary-theme">Insights</span> & Research
             </h2>
             <p className="text-slate-500 font-medium mt-2 text-[10px] leading-relaxed max-w-lg">
               Stay updated with the latest breakthroughs in healthcare technology and clinical excellence.
             </p>
          </div>
          <Link
            href="/blogs"
            className="inline-flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest text-slate-600 hover:text-primary-theme hover:bg-white hover:border-primary-theme/30 transition-all shadow-sm group"
          >
            Explore All Insights <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading
            ? [1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse space-y-3 text-left bg-slate-50/50 p-4 rounded-[2rem] border border-slate-100/50">
                  <div className="aspect-video bg-slate-200/60 rounded-2xl" />
                  <div className="h-4 bg-slate-200/60 rounded-lg w-3/4" />
                  <div className="h-3 bg-slate-200/60 rounded-lg w-full" />
                </div>
              ))
            : blogs.map((blog, idx) => (
                <motion.article
                  key={blog._id}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                  className="group bg-white rounded-[2rem] border border-slate-100 overflow-hidden hover:shadow-xl hover:shadow-slate-200/40 hover:-translate-y-1 transition-all duration-500 flex flex-col text-left"
                >
                  <Link href={`/blogs/${blog.slug}`} className="block relative aspect-[4/3] overflow-hidden">
                    <img
                      src={blog.featuredImage || 'https://images.unsplash.com/photo-1576091160550-2173dba9697a?auto=format&fit=crop&q=80&w=800'}
                      alt={blog.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute top-2.5 left-2.5">
                      <span className="px-2 py-0.5 rounded-md bg-white/95 backdrop-blur-md text-slate-900 text-[6px] font-bold uppercase tracking-widest shadow-sm">
                        {blog.category}
                      </span>
                    </div>
                  </Link>

                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-center gap-2 text-[7px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
                      <span className="flex items-center gap-1" suppressHydrationWarning>
                         {new Date(blog.publishedAt || blog.createdAt).toLocaleDateString()}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-slate-200" />
                      <span className="flex items-center gap-1">
                        5 MIN
                      </span>
                    </div>
                    
                    <Link href={`/blogs/${blog.slug}`}>
                      <h3 className="text-xs font-black text-slate-900 leading-snug tracking-tight mb-2.5 group-hover:text-primary-theme transition-colors line-clamp-2  uppercase">
                        {blog.title}
                      </h3>
                    </Link>
                    
                    <p className="text-slate-500 font-medium text-[9px] leading-snug line-clamp-2 mb-4 opacity-80">
                      {blog.excerpt}
                    </p>

                    <Link
                      href={`/blogs/${blog.slug}`}
                      className="mt-auto inline-flex items-center gap-1.5 text-[7px] font-black uppercase tracking-widest text-slate-400 group-hover:text-primary-theme transition-colors"
                    >
                      Read Story <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </motion.article>
              ))}
        </div>
      </div>

      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[300px] h-[300px] bg-primary-theme/5 rounded-full blur-[80px] pointer-events-none" />
    </section>
  );
};

export default LandingBlogs;
