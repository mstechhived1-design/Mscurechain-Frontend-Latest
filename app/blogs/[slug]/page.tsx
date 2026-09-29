'use client';

import React, { useEffect, useState, use } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { 
  Share2, 
  Bookmark, 
  Clock,
  ChevronLeft,
  Quote,
  ArrowRight,
  Facebook,
  Twitter,
  Linkedin,
  Mail
} from 'lucide-react';
import LandingNavbar from "@/components/navbar/LandingNavbar";
import Footer from "@/components/footer/Footer";
import { contentService } from '@/lib/integrations/services/content.service';
import { Blog } from '@/lib/integrations/types/cms';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const BlogPostPage = ({ params }: { params: Promise<{ slug: string }> }) => {
  const router = useRouter();
  const { slug } = use(params);
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedBlogs, setRelatedBlogs] = useState<Blog[]>([]);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const data = await contentService.getPublicBlogs();
        const post = data.find((b: Blog) => b.slug === slug);
        setBlog(post || null);
        
        if (post) {
            const related = data
                .filter((b: Blog) => b._id !== post._id && b.category === post.category)
                .slice(0, 3);
            setRelatedBlogs(related.length > 0 ? related : data.filter((b: Blog) => b._id !== post._id).slice(0, 3));
        }
      } catch (error) {
        console.error('Error fetching blog:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBlog();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-t-2 border-primary-theme rounded-full animate-spin" />
          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Loading Study</p>
        </div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <h1 className="text-2xl font-black text-slate-900 mb-4 italic tracking-tight uppercase">Record Not Found</h1>
          <p className="text-slate-500 mb-8 max-w-sm mx-auto font-medium text-[10px]">Archive unreachable or relocated.</p>
          <button 
            onClick={() => router.push('/blogs')}
            className="bg-primary-theme text-white px-8 py-3 rounded-xl font-black shadow-lg shadow-primary-theme/20 hover:scale-105 active:scale-95 transition-all text-[9px] uppercase tracking-widest"
          >
            Return to Library
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white selection:bg-primary-theme/10 selection:text-primary-theme">
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-primary-theme z-[60] origin-left"
        style={{ scaleX }}
      />
      
      <LandingNavbar variant="detail" />

      <main className="pt-24">
        {/* Balanced Header */}
        <section className="px-6 pb-12">
           <div className="max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <Link 
                  href="/blogs"
                  className="inline-flex items-center gap-1.5 text-slate-400 hover:text-primary-theme font-black text-[7px] md:text-[8px] uppercase tracking-widest transition-all group shrink-0"
                >
                  <ChevronLeft size={10} className="group-hover:-translate-x-1 transition-transform" /> Back to Insights
                </Link>

                <div className="flex items-center gap-3">
                   <span className="px-2 py-0.5 rounded-md bg-primary-theme/5 border border-primary-theme/10 text-primary-theme text-[6.5px] md:text-[7px] font-black uppercase tracking-widest">
                      {blog.category}
                   </span>
                   <span className="w-1 h-1 rounded-full bg-slate-200" />
                   <div className="flex items-center gap-1 text-slate-300 text-[6.5px] md:text-[7px] font-black uppercase tracking-widest">
                      <Clock size={8} className="text-primary-theme" /> {Math.ceil(blog.content.length / 1000) + 2} MIN READ
                   </div>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >

                 <h1 className="text-lg md:text-xl lg:text-xl font-black text-slate-900 leading-tight tracking-tight mb-6 italic uppercase">
                   {blog.title}
                 </h1>

                 <div className="flex flex-wrap items-center justify-between gap-6 py-6 border-y border-slate-100">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-slate-100 p-0.5 ring-1 ring-slate-100 overflow-hidden">
                         <img 
                           src={`https://ui-avatars.com/api/?name=${encodeURIComponent(blog.author)}&background=random`} 
                           alt={blog.author}
                           className="w-full h-full object-cover rounded-[0.6rem]"
                         />
                       </div>
                       <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Contributor</p>
                          <h4 className="text-sm md:text-lg font-black text-slate-900 leading-none italic uppercase tracking-tight">{blog.author}</h4>
                       </div>
                    </div>

                    <div className="flex items-center gap-6">
                       <div className="text-right hidden md:block">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Published on</p>
                          <p className="text-xs font-black text-slate-900 uppercase">
                            {new Date(blog.publishedAt || blog.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                          </p>
                       </div>
                       <div className="flex gap-2">
                         <button className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-primary-theme transition-all border border-slate-100 hover:bg-white hover:shadow-lg">
                            <Share2 size={14} />
                         </button>
                         <button className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-primary-theme transition-all border border-slate-100 hover:bg-white hover:shadow-lg">
                            <Bookmark size={14} />
                         </button>
                       </div>
                    </div>
                </div>
              </motion.div>
           </div>
        </section>

        {/* Compact Media Section */}
        <section className="px-6 mb-12">
           <div className="max-w-5xl mx-auto">
              <motion.div 
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-full rounded-3xl overflow-hidden shadow-2xl relative border border-slate-100 group"
              >
                 <img 
                   src={blog.featuredImage || 'https://images.unsplash.com/photo-1576091160550-2173dba9697a?auto=format&fit=crop&q=80&w=2000'} 
                   alt={blog.title}
                   className="w-full h-auto block transition-transform duration-1000 group-hover:scale-105"
                 />
              </motion.div>
           </div>
        </section>

        {/* Scaled Content Layout */}
        <section className="px-6 pb-24">
           <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-16">
              
              <div className="flex-1 lg:max-w-4xl">
                 <div className="blog-content prose prose-sm prose-slate max-w-none text-slate-500 font-medium leading-relaxed">
                    <div 
                      className="whitespace-pre-wrap selection:bg-primary-theme/10 first-letter:text-4xl first-letter:font-black first-letter:text-primary-theme first-letter:mr-2 first-letter:float-left first-letter:mt-1.5"
                      dangerouslySetInnerHTML={{ __html: blog.content }} 
                    />
                 </div>

                 {/* Minimal Discovery Tags */}
                 {blog.tags && blog.tags.length > 0 && (
                     <div className="mt-12 pt-6 border-t border-slate-100 flex flex-wrap gap-1.5">
                         {blog.tags.map(tag => (
                             <span key={tag} className="px-3 py-1.5 rounded-lg bg-slate-50 text-slate-400 font-black text-[8px] uppercase tracking-widest hover:text-primary-theme hover:bg-primary-theme/5 cursor-pointer border border-slate-100 transition-all">
                                 {tag}
                             </span>
                         ))}
                     </div>
                 )}

                  {/* Compact Contributor Card */}
                  <div className="mt-12 p-6 md:p-8 bg-slate-900 rounded-3xl relative overflow-hidden group flex flex-col sm:flex-row items-center gap-6">
                     <div className="w-16 h-16 rounded-2xl bg-white/10 p-0.5 shadow-2xl shrink-0">
                        <img 
                           src={`https://ui-avatars.com/api/?name=${encodeURIComponent(blog.author)}&background=random`} 
                           alt={blog.author}
                           className="w-full h-full object-cover rounded-[0.9rem]"
                         />
                     </div>
                     <div className="text-center sm:text-left">
                        <h5 className="text-lg font-black text-white mb-1 italic uppercase tracking-tight">Contributor</h5>
                        <p className="text-slate-400 text-xs md:text-sm font-medium leading-relaxed mb-4">
                          Leading clinical systems researcher and medical technology specialist at MSCureChain network.
                        </p>
                        <Link href="/blogs" className="inline-flex items-center gap-2 text-primary-theme font-black text-[10px] uppercase tracking-[0.2em] group-hover:gap-3 transition-all">
                           VIEW DIRECTORY <ArrowRight size={12} />
                        </Link>
                     </div>
                     <Quote className="absolute -bottom-2 -right-2 text-white/5" size={80} />
                  </div>
              </div>

              {/* Ultra-Minimal Sidebar */}
              <aside className="lg:w-72 shrink-0 hidden lg:block">
                 <div className="sticky top-32 space-y-12">
                    <div className="space-y-4">
                       <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-500 overflow-hidden">Distribute Insight</h5>
                       <div className="flex gap-2">
                          {[Facebook, Twitter, Linkedin, Mail].map((Icon, idx) => (
                             <button key={idx} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-primary-theme hover:bg-white transition-all border border-slate-100 hover:shadow-lg">
                                <Icon size={16} />
                             </button>
                          ))}
                       </div>
                    </div>

                    <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 shadow-sm">
                        <h5 className="text-base font-black text-slate-900 mb-2 italic uppercase tracking-tight">Alerts</h5>
                        <p className="text-slate-500 text-xs font-medium leading-relaxed mb-6">Get clinical updates and breakthroughs delivered daily.</p>
                        <button className="w-full bg-slate-900 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-theme transition-all shadow-xl shadow-slate-900/10">
                            Join Team
                        </button>
                    </div>
                 </div>
              </aside>
           </div>
        </section>

        {/* Clean Further Reading Grid */}
        <section className="px-6 py-24 bg-slate-50/50">
           <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-12">
                 <div>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter italic uppercase">Further Records</h2>
                    <div className="w-12 h-1 bg-primary-theme mt-2 rounded-full" />
                 </div>
                 <Link href="/blogs" className="items-center gap-2 text-slate-400 hover:text-primary-theme font-black text-[10px] uppercase tracking-widest transition-all inline-flex group">
                    View Library <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                 </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                 {relatedBlogs.map((item, idx) => (
                    <motion.div 
                        key={item._id}
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.1 }}
                        className="group bg-white rounded-3xl border border-slate-100 p-6 hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-500 flex flex-col"
                    >
                        <div className="aspect-video rounded-2xl overflow-hidden mb-6">
                            <img src={item.featuredImage || 'https://images.unsplash.com/photo-1576091160550-2173dba9697a?auto=format&fit=crop&q=80&w=800'} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        </div>
                        <p className="text-[10px] font-black text-primary-theme uppercase tracking-widest mb-2">{item.category}</p>
                        <h4 className="text-base md:text-lg font-black text-slate-900 mb-4 group-hover:text-primary-theme transition-colors line-clamp-2 italic uppercase leading-tight tracking-tight">{item.title}</h4>
                        <Link href={`/blogs/${item.slug}`} className="mt-auto inline-flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-primary-theme hover:gap-3 transition-all">
                            Explore Article <ArrowRight size={12} />
                        </Link>
                    </motion.div>
                 ))}
              </div>
           </div>
        </section>
      </main>

      <Footer />

      <style jsx global>{`
        .blog-content p {
          margin-bottom: 1.5rem;
          line-height: 1.7;
          font-size: 1rem;
          color: #475569;
        }
        @media (max-width: 768px) {
          .blog-content p {
            font-size: 0.875rem;
          }
        }
        .blog-content h2 {
          font-size: 1.5rem;
          font-weight: 900;
          color: #0f172a;
          margin: 2.5rem 0 1.25rem 0;
          letter-spacing: -0.02em;
          font-style: italic;
          line-height: 1.2;
          text-transform: uppercase;
        }
        @media (max-width: 768px) {
          .blog-content h2 {
            font-size: 1.25rem;
          }
        }
        .blog-content blockquote {
          border-left: 2px solid #3b82f6;
          padding: 0.75rem 1rem;
          font-style: italic;
          color: #1e293b;
          margin: 1.5rem 0;
          font-weight: 700;
          font-size: 0.9rem;
          line-height: 1.3;
          background: #f8fafc;
          border-radius: 0 0.75rem 0.75rem 0;
        }
        .blog-content strong {
          color: #0f172a;
          font-weight: 800;
        }
      `}</style>
    </div>
  );
};

export default BlogPostPage;
